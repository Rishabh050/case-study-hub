import { Client } from 'basic-ftp';
import { Readable } from 'stream';

/**
 * Server-side storage service for BS Server.
 * Supports both:
 * 1. HTTPS upload endpoint (Port 443) - Strictly required for Vercel/cloud serverless environments.
 * 2. Server-side FTP upload (Port 21) - For local dev / internal networks where port 21 is open.
 */

export interface FtpUploadResult {
  success: boolean;
  fileName: string;
  publicUrl: string;
  remotePath: string;
  error?: string;
}

export function getCleanFileName(fileName: string): string {
  if (!fileName) return 'document.pdf';
  const base = fileName.split('/').pop()?.split('\\').pop() || fileName;
  return base.trim();
}

/**
 * Uploads a PDF buffer to BS Server.
 * In Vercel / Cloud environments: Strictly executes HTTPS POST to BS_UPLOAD_HTTP_ENDPOINT.
 * In Local Development: Uses BS_UPLOAD_HTTP_ENDPOINT if present, or falls back to FTP port 21.
 */
export async function uploadToBsServerFtp(
  fileBuffer: Buffer,
  fileName: string
): Promise<FtpUploadResult> {
  const cleanName = getCleanFileName(fileName);
  const publicUrl = `https://bs.cisinlive.com/dinesh/rishabh/Case-Studies/${encodeURIComponent(cleanName)}`;
  const isCloudEnv = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production');

  const httpEndpoint = process.env.BS_UPLOAD_HTTP_ENDPOINT || (isCloudEnv ? 'https://bs.cisinlive.com/dinesh/rishabh/upload.php' : '');
  const authToken = process.env.BS_UPLOAD_AUTH_TOKEN || 'cisin_case_study_secure_upload_token_2026_9x8f';

  // 1. Cloud / HTTPS Upload Pathway (Port 443)
  if (httpEndpoint || isCloudEnv) {
    if (!httpEndpoint) {
      return {
        success: false,
        fileName: cleanName,
        publicUrl: '',
        remotePath: '',
        error: 'BS_UPLOAD_HTTP_ENDPOINT is not configured in Vercel environment variables.',
      };
    }

    try {
      console.log('[BS Storage] Executing HTTPS Upload to:', httpEndpoint);
      const formData = new FormData();
      const uint8 = new Uint8Array(fileBuffer);
      const blob = new Blob([uint8], { type: 'application/pdf' });
      formData.append('file', blob, cleanName);

      const httpRes = await fetch(httpEndpoint, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
          'X-Upload-Auth': authToken,
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const responseText = await httpRes.text();
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch (e) {
        // Non-JSON response
      }

      if (!httpRes.ok) {
        const errorMsg = responseJson?.error || `HTTPS upload failed with status ${httpRes.status}: ${responseText.slice(0, 150)}`;
        console.error('[BS Storage HTTPS] Upload Error:', errorMsg);
        return {
          success: false,
          fileName: cleanName,
          publicUrl: '',
          remotePath: '',
          error: `BS Server HTTPS upload error: ${errorMsg}`,
        };
      }

      console.log('[BS Storage HTTPS] Upload Successful for:', cleanName);
      return {
        success: true,
        fileName: cleanName,
        publicUrl: responseJson?.publicUrl || publicUrl,
        remotePath: `/rishabh/Case-Studies/${cleanName}`,
      };
    } catch (httpErr: any) {
      console.error('[BS Storage HTTPS] Connection Error:', httpErr.message);
      return {
        success: false,
        fileName: cleanName,
        publicUrl: '',
        remotePath: '',
        error: `BS Server HTTPS connection error: ${httpErr.message}`,
      };
    }
  }

  // 2. Localhost Development Fallback: Plain FTP Socket (Port 21)
  const ftpHost = (process.env.FTP_HOST || 'ftp.bs.cisinlive.com').trim();
  const ftpPort = parseInt((process.env.FTP_PORT || '21').trim(), 10);
  const ftpUser = (process.env.FTP_USER || 'dinesh@bs.cisinlive.com').trim();
  const ftpPassword = (process.env.FTP_PASSWORD || '').trim().replace(/^["']|["']$/g, '');
  const ftpRemotePath = (process.env.FTP_REMOTE_PATH || '/rishabh/Case-Studies').trim();

  const client = new Client(15000);
  client.ftp.verbose = false;

  try {
    // Connect to FTP host
    await client.access({
      host: ftpHost,
      port: ftpPort,
      user: ftpUser,
      password: ftpPassword,
      secure: false,
    });

    await client.ensureDir(ftpRemotePath);

    const stream = Readable.from(fileBuffer);
    await client.uploadFrom(stream, cleanName);

    const fullRemotePath = `${ftpRemotePath.replace(/\/+$/, '')}/${cleanName}`;
    console.log('[BS Storage FTP] Local Upload Successful:', {
      fileName: cleanName,
      publicUrl,
      sizeBytes: fileBuffer.length,
    });

    return {
      success: true,
      fileName: cleanName,
      publicUrl,
      remotePath: fullRemotePath,
    };
  } catch (err: any) {
    return {
      success: false,
      fileName: cleanName,
      publicUrl: '',
      remotePath: '',
      error: err.message || 'Failed to upload PDF file via FTP.',
    };
  } finally {
    client.close();
  }
}
