import { NextRequest, NextResponse } from 'next/server';
import { getBsServerPdfUrl } from '@/lib/storage/pdf-url-resolver';
import {
  generateDownloadUrl,
  isB2Configured,
  getB2DiagnosticStatus,
} from '@/lib/storage/backblaze';
import { connectToDatabase } from '@/lib/db/mongodb';
import { CaseStudyModel } from '@/lib/models/CaseStudy';
import ALL_61_RECORDS from '@/scripts/all_61_published_records.json';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const fileNameParam = searchParams.get('fileName') || searchParams.get('file_name');
    const download = searchParams.get('download') === 'true';
    const diagnostic = searchParams.get('diagnostic') === 'true';
    const caseStudyId = searchParams.get('id') || null;

    // Safe Diagnostic Health Mode
    if (diagnostic) {
      const diagStatus = await getB2DiagnosticStatus(key || undefined);
      return NextResponse.json({
        success: true,
        diagnostic: diagStatus,
        bsServerBaseUrl: 'https://bs.cisinlive.com/dinesh/rishabh/Case-Studies',
      });
    }

    let targetFileName: string | null = fileNameParam || null;

    // Resolve pdf_file_name if not provided directly
    if (!targetFileName && key) {
      // 1. Check if key is raw filename (e.g. "Linxitt.pdf")
      if (!key.startsWith('case-studies/')) {
        targetFileName = key;
      } else {
        // 2. Try looking up in database or local store by pdf_storage_key or id
        const localMatch = ALL_61_RECORDS.find(
          (r: any) => r.pdf_storage_key === key || r.id === caseStudyId || r.pdf_file_name === key
        );
        if (localMatch?.pdf_file_name) {
          targetFileName = localMatch.pdf_file_name;
        } else {
          // Try MongoDB lookup if DB is connected
          try {
            await connectToDatabase();
            const dbMatch = await CaseStudyModel.findOne({
              $or: [{ pdf_storage_key: key }, { _id: caseStudyId }, { pdf_file_name: key }],
            }).lean();
            if (dbMatch?.pdf_file_name) {
              targetFileName = dbMatch.pdf_file_name;
            }
          } catch (e) {
            // DB lookup optional fallback
          }
        }

        // Fallback: strip case-studies/ timestamp-uuid prefix if name couldn't be resolved
        if (!targetFileName) {
          const rawBasename = key.split('/').pop() || '';
          // Remove timestamp-uuid prefix e.g. 1786608446819-b9ca3af6-
          targetFileName = rawBasename.replace(/^\d+-[a-f0-9]{8}-/, '');
        }
      }
    }

    // Generate BS Server HTTPS URL
    const bsUrl = targetFileName ? getBsServerPdfUrl(targetFileName) : '';

    if (bsUrl) {
      if (download) {
        return NextResponse.redirect(bsUrl, 307);
      }
      return NextResponse.json({
        success: true,
        url: bsUrl,
        isB2Configured: true,
        storageKey: key || targetFileName,
        fileName: targetFileName,
        provider: 'BS_SERVER',
      });
    }

    // Fallback to Backblaze B2 presigned URL if BS Server resolution fails & B2 is configured
    if (key && isB2Configured()) {
      const rawFileName = key.split('/').pop() || 'document.pdf';
      const presignedUrl = await generateDownloadUrl(key, 3600, rawFileName, download);
      if (presignedUrl && presignedUrl.startsWith('http')) {
        if (download) {
          return NextResponse.redirect(presignedUrl, 307);
        }
        return NextResponse.json({
          success: true,
          url: presignedUrl,
          isB2Configured: true,
          storageKey: key,
          provider: 'BACKBLAZE_B2_FALLBACK',
        });
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Unable to resolve PDF URL for the requested case study.',
      },
      { status: 404 }
    );
  } catch (err: any) {
    console.error('[API /api/pdf/download] Server error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process PDF download request' },
      { status: 500 }
    );
  }
}
