import { Client } from 'basic-ftp';
import { Readable } from 'stream';

/**
 * Server-side storage service for BS Server.
 * Supports both:
 * 1. Server-side FTP upload (Port 21) - for local dev / networks where port 21 is open.
 * 2. HTTPS upload endpoint (Port 443) - for Vercel/cloud serverless environments where FTP port 21 is blocked by corporate firewall.
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
 * Attempts HTTP/HTTPS upload first if BS_UPLOAD_HTTP_ENDPOINT is set,
 * otherwise performs server-side FTP upload with passive mode and 15s timeout.
 */
export async function uploadToBsServerFtp(
  fileBuffer: Buffer,
  fileName: string
): Promise<FtpUploadResult> {
  const cleanName = getCleanFileName(fileName);
  const publicUrl = `https://bs.cisinlive.com/dinesh/rishabh/Case-Studies/${encodeURIComponent(cleanName)}`;

  // 1. Check if HTTP/HTTPS upload endpoint is configured (for cloud / Vercel bypass of FTP port 21 firewall)
  const httpEndpoint = process.env.BS_UPLOAD_HTTP_ENDPOINT;
  if (httpEndpoint) {
    try {
      console.log('[BS Storage] Attempting HTTPS Upload to:', httpEndpoint);
      const formData = new FormData();
      const uint8 = new Uint8Array(fileBuffer);
      const blob = new Blob([uint8], { type: 'application/pdf' });
      formData.append('file', blob, cleanName);

      const httpRes = await fetch(httpEndpoint, {
        method: 'POST',
        headers: {
          'X-Upload-Auth': process.env.BS_UPLOAD_AUTH_TOKEN || '',
        },
        body: formData,
      });

      if (httpRes.ok) {
        console.log('[BS Storage] HTTPS Upload Successful for:', cleanName);
        return {
          success: true,
          fileName: cleanName,
          publicUrl,
          remotePath: `/rishabh/Case-Studies/${cleanName}`,
        };
      }
    } catch (httpErr: any) {
      console.warn('[BS Storage] HTTPS upload endpoint failed, falling back to FTP:', httpErr.message);
    }
  }

  // 2. Server-Side FTP Upload (Port 21)
  const ftpHost = (process.env.FTP_HOST || 'ftp.bs.cisinlive.com').trim();
  const ftpPort = parseInt((process.env.FTP_PORT || '21').trim(), 10);
  const ftpUser = (process.env.FTP_USER || 'dinesh@bs.cisinlive.com').trim();
  const ftpPassword = (process.env.FTP_PASSWORD || '').trim().replace(/^["']|["']$/g, '');
  const ftpRemotePath = (process.env.FTP_REMOTE_PATH || '/rishabh/Case-Studies').trim();

  const client = new Client(15000); // 15-second socket timeout
  client.ftp.verbose = false;

  try {
    // 2a. Connect to FTP host
    try {
      await client.access({
        host: ftpHost,
        port: ftpPort,
        user: ftpUser,
        password: ftpPassword,
        secure: false, // Standard Plain FTP
      });
    } catch (connErr: any) {
      console.error('[BS Storage FTP] Connection Error:', connErr.message);
      if (connErr.message?.includes('ETIMEDOUT') || connErr.code === 'ETIMEDOUT') {
        throw new Error(
          `FTP connection timed out (${ftpHost}:${ftpPort}). If executing from cloud/Vercel, the corporate firewall at ${ftpHost} is blocking incoming cloud TCP port 21 traffic.`
        );
      }
      throw new Error(`FTP connection failed: ${connErr.message || 'Unable to connect to FTP server.'}`);
    }

    // 2b. Ensure remote directory exists and switch to it
    try {
      await client.ensureDir(ftpRemotePath);
    } catch (dirErr: any) {
      console.error('[BS Storage FTP] Remote Directory Error:', dirErr.message);
      throw new Error(`FTP remote directory error: Failed to access path "${ftpRemotePath}".`);
    }

    // 2c. Convert buffer to Readable stream and upload to FTP
    const stream = Readable.from(fileBuffer);
    try {
      await client.uploadFrom(stream, cleanName);
    } catch (upErr: any) {
      console.error('[BS Storage FTP] Upload Error:', upErr.message);
      throw new Error(`FTP file upload failed for "${cleanName}": ${upErr.message}`);
    }

    const fullRemotePath = `${ftpRemotePath.replace(/\/+$/, '')}/${cleanName}`;

    console.log('[BS Storage FTP] Upload Successful:', {
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
      error: err.message || 'Failed to upload PDF file to BS Server.',
    };
  } finally {
    client.close();
  }
}
