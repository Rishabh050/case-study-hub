import { PDFExtractionResult } from '../types/case-study';

export type { PDFExtractionResult };

/**
 * Extracts raw text and page metadata from a PDF file buffer.
 * Compatible with all pdf-parse versions (Function API & PDFParse Class API).
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<PDFExtractionResult> {
  try {
    if (!pdfBuffer || pdfBuffer.length === 0) {
      return {
        text: '',
        numPages: 0,
        hasExtractableText: false,
        error: 'PDF file buffer is empty.',
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParseModule = require('pdf-parse');

    let textContent = '';
    let pageCount = 1;
    let info = {};

    if (typeof pdfParseModule === 'function') {
      const data = await pdfParseModule(pdfBuffer);
      textContent = data.text || '';
      pageCount = data.numpages || 1;
      info = data.info || {};
    } else if (pdfParseModule && pdfParseModule.PDFParse) {
      const parser = new pdfParseModule.PDFParse(new Uint8Array(pdfBuffer));
      if (typeof parser.load === 'function') {
        await parser.load();
      }
      const data = await parser.getText();
      textContent = typeof data === 'string' ? data : data.text || '';
      pageCount = data.numpages || 1;
      info = data.info || {};
    } else if (pdfParseModule && typeof pdfParseModule.default === 'function') {
      const data = await pdfParseModule.default(pdfBuffer);
      textContent = data.text || '';
      pageCount = data.numpages || 1;
      info = data.info || {};
    }

    // Normalize and clean up whitespace
    const cleanText = (textContent || '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const hasExtractableText = cleanText.length > 30;

    return {
      text: cleanText,
      numPages: pageCount,
      info,
      hasExtractableText,
      error: hasExtractableText
        ? undefined
        : 'PDF contained little or no extractable text (it may be a scanned image or locked PDF).',
    };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown PDF parsing error';
    console.error('[PDF Extractor] Error parsing PDF buffer:', errMessage);

    return {
      text: '',
      numPages: 0,
      hasExtractableText: false,
      error: `Failed to extract text from PDF: ${errMessage}`,
    };
  }
}
