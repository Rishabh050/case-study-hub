import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf/extractor';
import { uploadToBsServerFtp } from '@/lib/storage/bs-ftp';

export const maxDuration = 120; // Allow up to 120 seconds timeout for large PDF upload & parsing
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided in request.' }, { status: 400 });
    }

    // Validate file type
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return NextResponse.json(
        { error: 'Invalid file format. Only PDF documents (.pdf) are allowed.' },
        { status: 400 }
      );
    }

    // Validate size limit (100MB)
    const MAX_SIZE_BYTES = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 100MB limit.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Server-side PDF Upload to BS Server via FTP
    const ftpResult = await uploadToBsServerFtp(buffer, file.name);

    if (!ftpResult.success) {
      console.error('[API /api/upload/pdf] BS Server FTP Upload Error:', ftpResult.error);
      return NextResponse.json(
        {
          error: `Failed to upload PDF to BS Server: ${ftpResult.error}`,
          details: ftpResult.error,
        },
        { status: 500 }
      );
    }

    // 2. Server-side PDF text extraction for Gemini AI metadata auto-filling
    let pdfExtraction;
    try {
      pdfExtraction = await extractTextFromPDF(buffer, file.name);
    } catch (extractErr: any) {
      console.warn('[API /api/upload/pdf] PDF text extraction warning:', extractErr.message);
      pdfExtraction = {
        text: '',
        numPages: 0,
        hasExtractableText: false,
        error: extractErr.message || 'PDF text extraction failed.',
      };
    }

    console.log('[API /api/upload/pdf] SUCCESS:', {
      fileName: ftpResult.fileName,
      publicUrl: ftpResult.publicUrl,
      extractedTextLength: pdfExtraction.text.length,
      hasExtractableText: pdfExtraction.hasExtractableText,
    });

    return NextResponse.json({
      success: true,
      pdfFileName: ftpResult.fileName,
      pdfFileSize: file.size,
      storageKey: ftpResult.fileName,
      publicUrl: ftpResult.publicUrl,
      extractedText: pdfExtraction.text,
      hasExtractableText: pdfExtraction.hasExtractableText,
      pageCount: pdfExtraction.numPages,
      extractionError: pdfExtraction.error || null,
    });
  } catch (err: any) {
    console.error('[API /api/upload/pdf] Server error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process and upload PDF' },
      { status: 500 }
    );
  }
}
