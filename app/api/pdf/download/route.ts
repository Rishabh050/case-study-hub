import { NextRequest, NextResponse } from 'next/server';
import { generateDownloadUrl } from '@/lib/storage/backblaze';
import fs from 'fs';
import path from 'path';

const LOCAL_SOURCE_DIR = 'D:\\Downloads\\new-case-study';

const isProduction = process.env.NODE_ENV === 'production';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const download = searchParams.get('download') === 'true';

    if (!key) {
      return NextResponse.json({ error: 'Missing storage key parameter.' }, { status: 400 });
    }

    // Clean filename extraction from key
    const keyParts = key.split('-');
    const rawFileName = keyParts.slice(3).join('-') || 'document.pdf';

    const presignedUrl = await generateDownloadUrl(key, 3600, rawFileName, download);

    // 1. If valid B2 presigned URL generated (starts with http)
    if (presignedUrl && presignedUrl.startsWith('http')) {
      if (download) {
        return NextResponse.redirect(presignedUrl, 307);
      }
      return NextResponse.json({ url: presignedUrl });
    }

    // 2. B2 Production Configuration Guard:
    // In production, missing B2 credentials strictly reject requests with HTTP 503 instead of falling back
    if (isProduction) {
      console.error('[B2 Production Guard] B2 storage credentials missing/unconfigured in production mode for key:', key);
      return NextResponse.json(
        { error: 'Storage service temporarily unavailable. Please contact administrator.' },
        { status: 503 }
      );
    }

    // 3. Development/Local Fallback: Serve binary PDF directly from source directory when B2 is unconfigured
    if (fs.existsSync(LOCAL_SOURCE_DIR)) {
      const files = fs.readdirSync(LOCAL_SOURCE_DIR);
      const normKey = key.toLowerCase().replace(/case-studies\//, '').replace(/[^a-z0-9]/g, '');

      const matchedFile = files.find((f) => {
        const normFile = f.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normFileNoExt = f.replace(/\.pdf$/i, '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return normKey.includes(normFileNoExt) || normFile.includes(normKey) || normFileNoExt.includes(normKey);
      });

      if (matchedFile) {
        const filePath = path.join(LOCAL_SOURCE_DIR, matchedFile);
        const fileBuffer = fs.readFileSync(filePath);

        const disposition = download
          ? `attachment; filename="${encodeURIComponent(matchedFile)}"`
          : `inline; filename="${encodeURIComponent(matchedFile)}"`;

        // If requested as JSON endpoint (View mode check), return API proxy URL
        if (!download && !request.headers.get('accept')?.includes('text/html')) {
          const streamUrl = `/api/pdf/download?key=${encodeURIComponent(key)}&download=true`;
          return NextResponse.json({ url: streamUrl });
        }

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': disposition,
            'Content-Length': fileBuffer.length.toString(),
          },
        });
      }
    }

    return NextResponse.json({ error: 'PDF file not available in storage.' }, { status: 404 });
  } catch (err: any) {
    console.error('[API /api/pdf/download] Error:', err);
    return NextResponse.json(
      { error: 'Failed to process PDF request safely.' },
      { status: 500 }
    );
  }
}


