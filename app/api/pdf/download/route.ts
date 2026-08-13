import { NextRequest, NextResponse } from 'next/server';
import { generateDownloadUrl, checkObjectExists } from '@/lib/storage/backblaze';
import fs from 'fs';
import path from 'path';

const LOCAL_SOURCE_DIR = 'D:\\Downloads\\new-case-study';
const isProduction = process.env.NODE_ENV === 'production';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const download = searchParams.get('download') === 'true';
    const caseStudyId = searchParams.get('id') || null;

    if (!key) {
      return NextResponse.json({ success: false, error: 'Missing storage key parameter.' }, { status: 400 });
    }

    // Ensure key prefix consistency (case-studies/...)
    let canonicalStorageKey = key;
    if (!canonicalStorageKey.startsWith('case-studies/') && !canonicalStorageKey.includes('/')) {
      canonicalStorageKey = `case-studies/${key}`;
    }

    const bucketName = process.env.B2_BUCKET_NAME || 'Case-Studies';
    const rawFileName = key.split('/').pop() || 'document.pdf';

    // 1. Check if object actually exists in B2 via HeadObject
    const existsInB2 = await checkObjectExists(canonicalStorageKey);

    let presignedUrl: string | null = null;
    if (existsInB2) {
      presignedUrl = await generateDownloadUrl(canonicalStorageKey, 3600, rawFileName, download);
    } else if (key !== canonicalStorageKey) {
      // Try raw key as fallback
      const existsRaw = await checkObjectExists(key);
      if (existsRaw) {
        canonicalStorageKey = key;
        presignedUrl = await generateDownloadUrl(key, 3600, rawFileName, download);
      }
    }

    console.log('=== DOWNLOAD DIAGNOSTIC ===', {
      requestedCaseStudyId: caseStudyId,
      databaseStorageKey: key,
      bucket: bucketName,
      exactObjectKey: canonicalStorageKey,
      generatedUrl: presignedUrl ? presignedUrl.slice(0, 100) + '...' : null,
      existsInB2: Boolean(presignedUrl && presignedUrl.startsWith('http')),
    });

    // 2. If valid B2 presigned URL generated
    if (presignedUrl && presignedUrl.startsWith('http')) {
      if (download) {
        return NextResponse.redirect(presignedUrl, 307);
      }
      return NextResponse.json({ success: true, url: presignedUrl, storageKey: canonicalStorageKey });
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
          return NextResponse.json({ success: true, url: streamUrl, storageKey: key });
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

    // 4. Clean JSON error response instead of broken B2 XML error page
    return NextResponse.json(
      {
        success: false,
        error: 'PDF object not found in Backblaze B2',
        storageKey: key,
        caseStudyId,
      },
      { status: 404 }
    );
  } catch (err: any) {
    console.error('[API /api/pdf/download] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to process PDF request safely.' },
      { status: 500 }
    );
  }
}
