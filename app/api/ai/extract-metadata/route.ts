import { NextRequest, NextResponse } from 'next/server';
import { extractMetadataFromText } from '@/lib/ai/metadata-extractor';
import { extractTextFromPdfBuffer } from '@/lib/pdf/text-extractor';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let textContent = '';
    let fileName = 'Uploaded Case Study.pdf';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No PDF file provided in form data.' }, { status: 400 });
      }

      fileName = file.name;
      const arrayBuffer = await file.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);

      const pdfExtraction = await extractTextFromPdfBuffer(pdfBuffer);
      textContent = pdfExtraction.text || '';
    } else {
      const body = await request.json().catch(() => ({}));
      textContent = typeof body.text === 'string' ? body.text : '';
      fileName = body.fileName || fileName;
    }

    // Always process metadata extraction gracefully (zero-hallucination)
    const metadata = await extractMetadataFromText(textContent, fileName);

    return NextResponse.json({
      success: true,
      metadata,
      status: metadata.extraction_status || 'completed',
    });
  } catch (err: any) {
    console.error('[API /api/ai/extract-metadata] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to extract AI metadata.' },
      { status: 500 }
    );
  }
}
