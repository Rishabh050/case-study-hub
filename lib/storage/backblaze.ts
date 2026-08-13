import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

/**
 * Backblaze B2 Storage Service Abstraction (S3 Compatible API)
 * All operations run strictly on the server-side.
 */

function getS3Client(): { client: S3Client | null; bucketName: string } {
  const endpoint = process.env.B2_ENDPOINT;
  const keyId = process.env.B2_KEY_ID;
  const applicationKey = process.env.B2_APPLICATION_KEY;
  const bucketName = process.env.B2_BUCKET_NAME || 'Case-Studies';

  if (!endpoint || !keyId || !applicationKey) {
    console.warn(
      '[Backblaze B2] Credentials missing (B2_ENDPOINT, B2_KEY_ID, B2_APPLICATION_KEY). Storage calls will fail until configured in .env.'
    );
    return { client: null, bucketName };
  }

  const regionMatch = endpoint.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com/i);
  const region = regionMatch ? regionMatch[1] : 'us-east-005';

  const client = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId: keyId,
      secretAccessKey: applicationKey,
    },
    forcePathStyle: true,
  });

  return { client, bucketName };
}

/**
 * Sanitizes original filename and generates a secure, unique canonical storage key.
 * Pattern: case-studies/{timestamp}-{uuid8}-{sanitizedFilename}
 */
export function generateSecureStorageKey(originalFileName: string): string {
  const sanitized = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
  const uuid = crypto.randomUUID();
  const timestamp = Date.now();
  return `case-studies/${timestamp}-${uuid.slice(0, 8)}-${sanitized}`;
}

/**
 * Verifies if an object exists in Backblaze B2 via HeadObjectCommand.
 */
export async function checkObjectExists(storageKey: string): Promise<boolean> {
  const { client, bucketName } = getS3Client();
  if (!client || !storageKey) return false;

  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
    });
    await client.send(command);
    return true;
  } catch (error: any) {
    console.warn(`[Backblaze B2 HeadObject] Object not found for key "${storageKey}":`, error.name || error.message);
    return false;
  }
}

/**
 * Uploads a file buffer to Backblaze B2 PRIVATE bucket.
 * Verifies object existence via HeadObject before returning success.
 */
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string = 'application/pdf'
): Promise<{ storageKey: string; fileName: string; uploadSuccess: boolean }> {
  const { client, bucketName } = getS3Client();
  const storageKey = generateSecureStorageKey(fileName);

  if (!client) {
    console.warn('[Backblaze B2] B2 client not configured. Simulating upload in development mode.');
    return {
      storageKey,
      fileName,
      uploadSuccess: false,
    };
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await client.send(command);

  // Immediately verify object exists using HeadObject
  const uploadSuccess = await checkObjectExists(storageKey);

  console.log('=== B2 UPLOAD DIAGNOSTIC ===', {
    bucket: bucketName,
    objectKey: storageKey,
    fileName,
    uploadSuccess,
  });

  return {
    storageKey,
    fileName,
    uploadSuccess,
  };
}

/**
 * Deletes a file from Backblaze B2.
 */
export async function deleteFile(storageKey: string): Promise<boolean> {
  const { client, bucketName } = getS3Client();

  if (!client) {
    console.warn('[Backblaze B2] B2 client not configured. Skipping delete.');
    return true;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
    });
    await client.send(command);
    return true;
  } catch (error) {
    console.error(`[Backblaze B2] Error deleting storage key ${storageKey}:`, error);
    return false;
  }
}

/**
 * Downloads a file buffer from Backblaze B2.
 */
export async function getFile(storageKey: string): Promise<Buffer> {
  const { client, bucketName } = getS3Client();

  if (!client) {
    throw new Error('[Backblaze B2] B2 credentials not configured.');
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
  });

  const response = await client.send(command);
  if (!response.Body) {
    throw new Error(`[Backblaze B2] Empty file body for key: ${storageKey}`);
  }

  const byteArray = await response.Body.transformToByteArray();
  return Buffer.from(byteArray);
}

/**
 * Generates a presigned download/view URL for Backblaze B2.
 * Uses EXACT canonical storageKey without stripping folder prefixes.
 */
export async function generateDownloadUrl(
  storageKey: string,
  expiresInSeconds: number = 3600,
  fileName?: string,
  download: boolean = false
): Promise<string | null> {
  const { client, bucketName } = getS3Client();

  const isPlaceholder =
    process.env.B2_KEY_ID?.includes('your-b2-key-id') ||
    process.env.B2_APPLICATION_KEY?.includes('your-b2-application-key');

  if (!client || isPlaceholder) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Backblaze B2 Guard] Storage client credentials missing in production mode.');
      return null;
    }
    console.warn('[Backblaze B2] B2 credentials missing. Returning fallback placeholder URL.');
    return `#b2-credentials-missing-storage-key-${storageKey}`;
  }

  // MUST use exact canonical storageKey as uploaded (e.g. case-studies/178655...-devops.pdf)
  const exists = await checkObjectExists(storageKey);
  if (!exists) {
    console.error(`[Backblaze B2] Cannot generate download URL. HeadObject failed for key: "${storageKey}"`);
    return null;
  }

  const cleanFileName = fileName || storageKey.split('/').pop() || 'document.pdf';

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
    ResponseContentType: 'application/pdf',
    ResponseContentDisposition: download
      ? `attachment; filename="${encodeURIComponent(cleanFileName)}"`
      : `inline; filename="${encodeURIComponent(cleanFileName)}"`,
  });

  const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });

  return url;
}
