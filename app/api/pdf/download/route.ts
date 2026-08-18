import { NextRequest, NextResponse } from 'next/server';
import {
  generateDownloadUrl,
  checkObjectExists,
  isB2Configured,
  getB2DiagnosticStatus,
} from '@/lib/storage/backblaze';
import fs from 'fs';
import path from 'path';

const LOCAL_SOURCE_DIR = 'D:\\Downloads\\new-case-study';
const isProduction = process.env.NODE_ENV === 'production';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const download = searchParams.get('download') === 'true';
    const diagnostic = searchParams.get('diagnostic') === 'true';
    const caseStudyId = searchParams.get('id') || null;

    // Safe Diagnostic Health Mode (NEVER reveals secret values)
    if (diagnostic) {
      const diagStatus = await getB2DiagnosticStatus(key || undefined);
      return NextResponse.json({
        success: true,
        diagnostic: diagStatus,
      });
    }

    if (!key) {
      return NextResponse.json(
        {
          success: false,
          isB2Configured: isB2Configured(),
          error: 'Missing storage key parameter.',
        },
        { status: 400 }
      );
    }

    const b2Ready = isB2Configured();
    const rawFileName = key.split('/').pop() || 'document.pdf';

    // 1. Server-side Presigned Download URL Generation via B2 S3 API
    let presignedUrl: string | null = null;
    if (b2Ready) {
      presignedUrl = await generateDownloadUrl(key, 3600, rawFileName, download);
    }

    console.log('=== DOWNLOAD DIAGNOSTIC ===', {
      requestedCaseStudyId: caseStudyId,
      databaseStorageKey: key,
      isB2Configured: b2Ready,
      generatedUrl: presignedUrl ? presignedUrl.slice(0, 100) + '...' : null,
      existsInB2: Boolean(presignedUrl && presignedUrl.startsWith('http')),
    });

    // 2. If valid B2 presigned URL generated
    if (presignedUrl && presignedUrl.startsWith('http')) {
      if (download) {
        return NextResponse.redirect(presignedUrl, 307);
      }
      return NextResponse.json({
        success: true,
        url: presignedUrl,
        isB2Configured: true,
        storageKey: key,
      });
    }

    // 3. Development/Local Fallback: Serve binary PDF directly from local source directory if B2 fails or in dev mode
    if (!isProduction && fs.existsSync(LOCAL_SOURCE_DIR)) {
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

        if (!download && !request.headers.get('accept')?.includes('text/html')) {
          const streamUrl = `/api/pdf/download?key=${encodeURIComponent(key)}&download=true`;
          return NextResponse.json({
            success: true,
            url: streamUrl,
            isB2Configured: b2Ready,
            storageKey: key,
          });
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

    // 4. Return clean JSON error status with exact B2 configuration state
    return NextResponse.json(
      {
        success: false,
        isB2Configured: b2Ready,
        error: b2Ready
          ? 'PDF object is currently unavailable in Backblaze B2 storage.'
          : 'Backblaze B2 environment variables are unconfigured.',
        storageKey: key,
        caseStudyId,
      },
      { status: 404 }
    );
  } catch (err: any) {
    console.error('[API /api/pdf/download] Error:', err);
    return NextResponse.json(
      {
        success: false,
        isB2Configured: isB2Configured(),
        error: 'Failed to process PDF request safely.',
      },
      { status: 500 }
    );
  }
}
