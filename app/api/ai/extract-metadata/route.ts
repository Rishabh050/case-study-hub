import { NextRequest, NextResponse } from 'next/server';
import { extractMetadataFromText } from '@/lib/ai/metadata-extractor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, fileName } = body;

    if (typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Extracted text content is required.' },
        { status: 400 }
      );
    }

    const metadata = await extractMetadataFromText(text, fileName);

    return NextResponse.json({
      success: true,
      metadata,
    });
  } catch (err: any) {
    console.error('[API /api/ai/extract-metadata] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to extract AI metadata.' },
      { status: 500 }
    );
  }
}
