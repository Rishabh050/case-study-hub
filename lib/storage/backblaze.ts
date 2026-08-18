import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

/**
 * Backblaze B2 Storage Service Abstraction (S3 Compatible API)
 * All operations run strictly on the server-side.
 */

/**
 * Checks if Backblaze B2 environment variables are properly configured.
 */
export function isB2Configured(): boolean {
  const endpoint = process.env.B2_ENDPOINT;
  const keyId = process.env.B2_KEY_ID;
  const applicationKey = process.env.B2_APPLICATION_KEY;

  if (!endpoint || !keyId || !applicationKey) return false;
  if (
    keyId.includes('your-b2-key-id') ||
    applicationKey.includes('your-b2-application-key')
  ) {
    return false;
  }

  return true;
}

function getS3Client(): { client: S3Client | null; bucketName: string } {
  const endpoint = process.env.B2_ENDPOINT;
  const keyId = process.env.B2_KEY_ID;
  const applicationKey = process.env.B2_APPLICATION_KEY;
  const bucketName = process.env.B2_BUCKET_NAME || 'Case-Studies';

  if (!endpoint || !keyId || !applicationKey || !isB2Configured()) {
    return { client: null, bucketName };
  }

  // Ensure clean endpoint with https:// protocol and no trailing slashes
  let cleanEndpoint = endpoint.trim().replace(/\/+$/, '');
  if (!cleanEndpoint.startsWith('http://') && !cleanEndpoint.startsWith('https://')) {
    cleanEndpoint = `https://${cleanEndpoint}`;
  }

  const regionMatch = cleanEndpoint.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com/i);
  const region = regionMatch ? regionMatch[1] : 'us-east-005';

  const client = new S3Client({
    endpoint: cleanEndpoint,
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
 * Generates storage key candidates to handle filename variations, spaces, and folder prefixes.
 */
export function getStorageKeyCandidates(rawKey: string): string[] {
  if (!rawKey) return [];
  const cleanKey = rawKey.trim();
  const candidates: string[] = [];

  // 1. Raw key as provided
  candidates.push(cleanKey);

  // 2. Prefixed with case-studies/ if not present
  if (!cleanKey.startsWith('case-studies/')) {
    candidates.push(`case-studies/${cleanKey}`);
  } else {
    // 3. Unprefixed key
    candidates.push(cleanKey.replace(/^case-studies\//, ''));
  }

  // 4. Space-to-underscore replacement
  const noSpace = cleanKey.replace(/\s+/g, '_');
  if (noSpace !== cleanKey) {
    candidates.push(noSpace);
    if (!noSpace.startsWith('case-studies/')) {
      candidates.push(`case-studies/${noSpace}`);
    }
  }

  return Array.from(new Set(candidates));
}

/**
 * Verifies if a single storage key candidate exists in Backblaze B2 via HeadObjectCommand.
 */
async function checkObjectExistsSingle(storageKey: string): Promise<boolean> {
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
    return false;
  }
}

/**
 * Verifies if an object exists in Backblaze B2 across candidate storage keys.
 */
export async function checkObjectExists(storageKey: string): Promise<boolean> {
  const candidates = getStorageKeyCandidates(storageKey);
  for (const cand of candidates) {
    const exists = await checkObjectExistsSingle(cand);
    if (exists) return true;
  }
  return false;
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
  const uploadSuccess = await checkObjectExistsSingle(storageKey);

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
    const candidates = getStorageKeyCandidates(storageKey);
    for (const cand of candidates) {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: cand,
      });
      await client.send(command);
    }
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

  const candidates = getStorageKeyCandidates(storageKey);
  let workingKey = candidates[0];
  for (const cand of candidates) {
    const exists = await checkObjectExistsSingle(cand);
    if (exists) {
      workingKey = cand;
      break;
    }
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: workingKey,
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
 * Uses exact canonical storageKey with candidate key resolution.
 */
export async function generateDownloadUrl(
  storageKey: string,
  expiresInSeconds: number = 3600,
  fileName?: string,
  download: boolean = false
): Promise<string | null> {
  const { client, bucketName } = getS3Client();

  if (!client || !isB2Configured()) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Backblaze B2 Guard] Storage client credentials missing in production mode.');
      return null;
    }
    return `#b2-credentials-missing-storage-key-${storageKey}`;
  }

  const candidates = getStorageKeyCandidates(storageKey);
  let workingKey = candidates[0];

  for (const cand of candidates) {
    const exists = await checkObjectExistsSingle(cand);
    if (exists) {
      workingKey = cand;
      break;
    }
  }

  const cleanFileName = fileName || workingKey.split('/').pop() || 'document.pdf';

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: workingKey,
    ResponseContentType: 'application/pdf',
    ResponseContentDisposition: download
      ? `attachment; filename="${encodeURIComponent(cleanFileName)}"`
      : `inline; filename="${encodeURIComponent(cleanFileName)}"`,
  });

  try {
    const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    return url;
  } catch (err) {
    console.error('[Backblaze B2 getSignedUrl] Error generating signed URL:', err);
    return null;
  }
}

export interface B2DiagnosticResult {
  B2_CONFIGURED: boolean;
  B2_AUTHENTICATION: 'success' | 'failed' | 'unconfigured';
  B2_BUCKET: 'available' | 'missing' | 'unconfigured';
  PDF_OBJECT: 'found' | 'not_found' | 'unconfigured';
  errorDetails?: string;
}

/**
 * Safe diagnostic status check that NEVER reveals secret credentials or keys.
 */
export async function getB2DiagnosticStatus(storageKey?: string): Promise<B2DiagnosticResult> {
  const configured = isB2Configured();
  if (!configured) {
    return {
      B2_CONFIGURED: false,
      B2_AUTHENTICATION: 'unconfigured',
      B2_BUCKET: 'unconfigured',
      PDF_OBJECT: 'unconfigured',
    };
  }

  const { client, bucketName } = getS3Client();
  if (!client) {
    return {
      B2_CONFIGURED: false,
      B2_AUTHENTICATION: 'failed',
      B2_BUCKET: 'unconfigured',
      PDF_OBJECT: 'unconfigured',
    };
  }

  try {
    // Check Bucket access safely via HeadBucket
    const headBucketCmd = new HeadBucketCommand({ Bucket: bucketName });
    await client.send(headBucketCmd);

    let pdfObjectStatus: 'found' | 'not_found' | 'unconfigured' = 'unconfigured';
    if (storageKey) {
      const exists = await checkObjectExists(storageKey);
      pdfObjectStatus = exists ? 'found' : 'not_found';
    }

    return {
      B2_CONFIGURED: true,
      B2_AUTHENTICATION: 'success',
      B2_BUCKET: 'available',
      PDF_OBJECT: pdfObjectStatus,
    };
  } catch (error: any) {
    return {
      B2_CONFIGURED: true,
      B2_AUTHENTICATION: 'failed',
      B2_BUCKET: 'missing',
      PDF_OBJECT: 'not_found',
      errorDetails: error.name || error.message || 'Authentication or bucket check failed',
    };
  }
}
