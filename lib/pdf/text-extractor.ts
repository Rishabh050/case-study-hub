import { extractTextFromPDF } from './extractor';
import { PDFExtractionResult } from '../types/case-study';

/**
 * Robust Multi-Page PDF Text Extraction Module
 * Delegates buffer parsing to extractor module.
 */
export async function extractTextFromPdfBuffer(pdfBuffer: Buffer): Promise<PDFExtractionResult> {
  return extractTextFromPDF(pdfBuffer);
}
