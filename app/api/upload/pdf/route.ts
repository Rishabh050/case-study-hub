import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/storage/backblaze';
import { extractTextFromPDF } from '@/lib/pdf/extractor';

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
        { error: 'Invalid file type. Only PDF documents are allowed.' },
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

    // 1. Server-side upload to Backblaze B2
    const { storageKey } = await uploadFile(buffer, file.name, 'application/pdf');

    // 2. Server-side PDF text extraction (pass file.name)
    const pdfExtraction = await extractTextFromPDF(buffer, file.name);

    console.log('PDF EXTRACTION RUNTIME CHECK', {
      fileName: file.name,
      textLength: pdfExtraction.text.length,
      first500Characters: pdfExtraction.text.slice(0, 500),
    });

    return NextResponse.json({
      success: true,
      pdfFileName: file.name,
      pdfFileSize: file.size,
      storageKey,
      extractedText: pdfExtraction.text,
      hasExtractableText: pdfExtraction.hasExtractableText,
      pageCount: pdfExtraction.numPages,
      extractionError: pdfExtraction.error || null,
    });
  } catch (err: any) {
    console.error('[API /api/upload/pdf] Server error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to upload and process PDF' },
      { status: 500 }
    );
  }
}
