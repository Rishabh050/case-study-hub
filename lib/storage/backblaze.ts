import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
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

  const client = new S3Client({
    endpoint,
    region: 'us-west-004', // Standard Backblaze S3 region or derived from endpoint
    credentials: {
      accessKeyId: keyId,
      secretAccessKey: applicationKey,
    },
    forcePathStyle: true,
  });

  return { client, bucketName };
}

/**
 * Sanitizes original filename and generates a secure, unique storage key.
 */
export function generateSecureStorageKey(originalFileName: string): string {
  const sanitized = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
  const uuid = crypto.randomUUID();
  const timestamp = Date.now();
  return `case-studies/${timestamp}-${uuid.slice(0, 8)}-${sanitized}`;
}

/**
 * Uploads a file buffer to Backblaze B2 PRIVATE bucket.
 */
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string = 'application/pdf'
): Promise<{ storageKey: string; fileName: string }> {
  const { client, bucketName } = getS3Client();
  const storageKey = generateSecureStorageKey(fileName);

  if (!client) {
    console.warn('[Backblaze B2] B2 client not configured. Simulating upload in development mode.');
    return {
      storageKey,
      fileName,
    };
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await client.send(command);

  return {
    storageKey,
    fileName,
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

export async function generateDownloadUrl(
  storageKey: string,
  expiresInSeconds: number = 3600,
  fileName?: string,
  download: boolean = false
): Promise<string | null> {
  const { client, bucketName } = getS3Client();

  if (!client) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Backblaze B2 Guard] Storage client credentials missing in production mode.');
      return null;
    }
    console.warn('[Backblaze B2] B2 credentials missing. Returning fallback placeholder URL.');
    return `#b2-credentials-missing-storage-key-${storageKey}`;
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
    ResponseContentType: 'application/pdf',
    ResponseContentDisposition: download
      ? `attachment; filename="${encodeURIComponent(fileName || 'case-study.pdf')}"`
      : `inline; filename="${encodeURIComponent(fileName || 'case-study.pdf')}"`,
  });

  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}


