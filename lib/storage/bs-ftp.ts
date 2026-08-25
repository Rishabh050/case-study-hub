import { Client } from 'basic-ftp';
import { Readable } from 'stream';

/**
 * Server-side FTP storage service for BS Server.
 * Uploads PDFs directly to: /rishabh/Case-Studies/<filename>
 * Credentials and FTP details run 100% server-side and are NEVER exposed to client.
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
  // Strip path components
  const base = fileName.split('/').pop()?.split('\\').pop() || fileName;
  return base.trim();
}

/**
 * Uploads a PDF buffer to BS Server via FTP server-side.
 */
export async function uploadToBsServerFtp(
  fileBuffer: Buffer,
  fileName: string
): Promise<FtpUploadResult> {
  const cleanName = getCleanFileName(fileName);

  const ftpHost = (process.env.FTP_HOST || 'ftp.bs.cisinlive.com').trim();
  const ftpPort = parseInt((process.env.FTP_PORT || '21').trim(), 10);
  const ftpUser = (process.env.FTP_USER || 'dinesh@bs.cisinlive.com').trim();
  const ftpPassword = (process.env.FTP_PASSWORD || '').trim().replace(/^["']|["']$/g, '');
  const ftpRemotePath = (process.env.FTP_REMOTE_PATH || '/rishabh/Case-Studies').trim();

  const client = new Client();
  client.ftp.verbose = false; // Do not leak FTP credentials into logs

  try {
    // 1. Connect to FTP host
    try {
      await client.access({
        host: ftpHost,
        port: ftpPort,
        user: ftpUser,
        password: ftpPassword,
        secure: false, // Standard FTP port 21
      });
    } catch (connErr: any) {
      console.error('[BS Server FTP] Connection/Auth Error:', connErr.message);
      throw new Error(`FTP connection failed: ${connErr.message || 'Unable to connect to FTP server.'}`);
    }

    // 2. Ensure remote directory exists and switch to it
    try {
      await client.ensureDir(ftpRemotePath);
    } catch (dirErr: any) {
      console.error('[BS Server FTP] Remote Directory Error:', dirErr.message);
      throw new Error(`FTP remote directory error: Failed to access remote path "${ftpRemotePath}".`);
    }

    // 3. Convert buffer to Readable stream and upload to FTP
    const stream = Readable.from(fileBuffer);
    try {
      await client.uploadFrom(stream, cleanName);
    } catch (upErr: any) {
      console.error('[BS Server FTP] Upload Error:', upErr.message);
      throw new Error(`FTP file upload failed for "${cleanName}": ${upErr.message}`);
    }

    const publicUrl = `https://bs.cisinlive.com/dinesh/rishabh/Case-Studies/${encodeURIComponent(cleanName)}`;
    const fullRemotePath = `${ftpRemotePath.replace(/\/+$/, '')}/${cleanName}`;

    console.log('[BS Server FTP] Upload Successful:', {
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
      error: err.message || 'Failed to upload PDF file to BS Server via FTP.',
    };
  } finally {
    client.close();
  }
}
