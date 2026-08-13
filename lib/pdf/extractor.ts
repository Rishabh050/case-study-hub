import { PDFExtractionResult } from '../types/case-study';
import zlib from 'zlib';

export type { PDFExtractionResult };

// Ensure DOMMatrix polyfill exists for pdfjs-dist in Node environment
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor(init?: any) {
      if (Array.isArray(init) && init.length >= 6) {
        this.a = init[0]; this.b = init[1]; this.c = init[2]; this.d = init[3]; this.e = init[4]; this.f = init[5];
      }
    }
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    rotate() { return this; }
    transformPoint(p?: any) { return p || { x: 0, y: 0 }; }
  };
}

export interface TextQualityMetrics {
  isValid: boolean;
  printableRatio: number;
  replacementCount: number;
  controlCount: number;
  reason?: string;
}

/**
 * Validates candidate PDF text to prevent garbled binary streams / mojibake.
 */
export function validateTextQuality(text: string): TextQualityMetrics {
  if (!text || typeof text !== 'string' || text.trim().length < 20) {
    return { isValid: false, printableRatio: 0, replacementCount: 0, controlCount: 0, reason: 'Text too short or empty' };
  }

  let printableCount = 0;
  let replacementCount = 0;
  let controlCount = 0;
  const totalChars = text.length;

  for (let i = 0; i < totalChars; i++) {
    const char = text.charAt(i);
    const code = text.charCodeAt(i);

    if (char === '\uFFFD') {
      replacementCount++;
    } else if (code === 0 || (code < 32 && code !== 9 && code !== 10 && code !== 13)) {
      controlCount++;
    } else if ((code >= 32 && code <= 126) || code >= 160) {
      printableCount++;
    }
  }

  const printableRatio = totalChars > 0 ? printableCount / totalChars : 0;

  if (replacementCount > 5) {
    return { isValid: false, printableRatio, replacementCount, controlCount, reason: `Excessive replacement characters (${replacementCount})` };
  }
  if (controlCount > 10) {
    return { isValid: false, printableRatio, replacementCount, controlCount, reason: `Contains binary control characters (${controlCount})` };
  }
  if (printableRatio < 0.85) {
    return { isValid: false, printableRatio, replacementCount, controlCount, reason: `Low printable ratio (${(printableRatio * 100).toFixed(1)}%)` };
  }

  return { isValid: true, printableRatio, replacementCount, controlCount };
}

/**
 * Validates a case study title candidate to ensure no garbled mojibake text is accepted.
 */
export function isValidTitle(title: string): boolean {
  if (!title || typeof title !== 'string') return false;
  const clean = title.trim();
  if (clean.length < 3 || clean.length > 250) return false;

  // Reject titles with replacement chars or control chars
  if (clean.includes('\uFFFD') || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(clean)) return false;

  // Reject titles starting with suspicious pdf binary strings or single letter + garbled chars
  if (/^u[\u0000-\x1F\x7F-\xFF]/i.test(clean) || /^%PDF/i.test(clean) || /^\d+$/i.test(clean)) return false;

  // Must contain at least one readable word (2+ letters)
  if (!/[a-zA-Z]{2,}/.test(clean)) return false;

  const quality = validateTextQuality(clean);
  return quality.printableRatio >= 0.85;
}

/**
 * Safe fallback raw stream text extractor for PDF buffers.
 * Decompresses FlateDecode streams and extracts PDF text operator strings.
 */
function safeFallbackRawPdfStreamExtractor(pdfBuffer: Buffer): string {
  try {
    const extractedTextParts: string[] = [];
    const content = pdfBuffer.toString('binary');
    const btBlockRegex = /\/BT[\s\S]*?\/ET/g;

    // 1. Extract uncompressed BT/ET string literals
    const btBlocks = content.match(btBlockRegex) || [];
    for (const block of btBlocks) {
      const stringLiterals = block.match(/\(([^()]+)\)/g);
      if (stringLiterals) {
        for (const str of stringLiterals) {
          const clean = str.slice(1, -1).replace(/\\([()\\])/g, '$1').trim();
          if (clean.length >= 2 && /[a-zA-Z0-9]/.test(clean)) {
            extractedTextParts.push(clean);
          }
        }
      }
    }

    // 2. Decompress FlateDecode streams and extract text
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match: RegExpExecArray | null;

    while ((match = streamRegex.exec(content)) !== null) {
      try {
        const streamStr = match[1];
        const streamBuffer = Buffer.from(streamStr, 'binary');
        let decompressed: Buffer | null = null;

        try {
          decompressed = zlib.inflateSync(streamBuffer);
        } catch (e1) {
          try {
            decompressed = zlib.unzipSync(streamBuffer);
          } catch (e2) {
            // Stream was not FlateDecode compressed or unparseable
          }
        }

        if (decompressed) {
          const decStr = decompressed.toString('utf8');
          const decBtBlocks = decStr.match(btBlockRegex) || [];
          for (const block of decBtBlocks) {
            const stringLiterals = block.match(/\(([^()]+)\)/g);
            if (stringLiterals) {
              for (const str of stringLiterals) {
                const clean = str.slice(1, -1).replace(/\\([()\\])/g, '$1').trim();
                if (clean.length >= 2 && /[a-zA-Z0-9]/.test(clean)) {
                  extractedTextParts.push(clean);
                }
              }
            }
          }
        }
      } catch (e) {
        // Skip unparseable stream
      }
    }

    const candidate = extractedTextParts.join(' ').replace(/\s+/g, ' ').trim();
    const quality = validateTextQuality(candidate);

    if (quality.isValid) {
      return candidate;
    }
    return '';
  } catch (e) {
    return '';
  }
}

/**
 * Extracts raw text and page metadata from a PDF file buffer.
 * Enforces text quality validation to prevent garbled mojibake titles.
 */
export async function extractTextFromPDF(pdfBuffer: Buffer, fileName?: string): Promise<PDFExtractionResult> {
  try {
    if (!pdfBuffer || pdfBuffer.length === 0) {
      return {
        text: '',
        numPages: 0,
        hasExtractableText: false,
        error: 'PDF file buffer is empty.',
      };
    }

    let textContent = '';
    let pageCount = 1;
    let info = {};
    let selectedEngine = 'None';
    let primaryTextLength = 0;
    let primaryPrintableRatio = 0;

    // Load pdf-parse module cleanly
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParseModule = require('pdf-parse');

    // Engine 1: pdf-parse Function API
    if (pdfParseModule) {
      try {
        let data: any = null;
        if (typeof pdfParseModule === 'function') {
          data = await pdfParseModule(pdfBuffer);
        } else if (pdfParseModule && typeof pdfParseModule.default === 'function') {
          data = await pdfParseModule.default(pdfBuffer);
        }

        if (data && data.text) {
          const sanitized = data.text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');
          const quality = validateTextQuality(sanitized);
          if (quality.isValid) {
            textContent = sanitized;
            pageCount = data.numpages || 1;
            info = data.info || {};
            selectedEngine = 'pdf-parse Function';
            primaryTextLength = sanitized.length;
            primaryPrintableRatio = quality.printableRatio;
          }
        }
      } catch (e: any) {
        console.warn('[PDF Extractor] pdf-parse Function engine failed:', e.message);
      }
    }

    // Engine 2: PDFParse Class API (if Engine 1 did not produce valid text)
    if (!textContent && pdfParseModule && pdfParseModule.PDFParse) {
      try {
        const parser = new pdfParseModule.PDFParse(new Uint8Array(pdfBuffer));
        if (typeof parser.load === 'function') {
          await parser.load();
        }
        const data = await parser.getText();
        const candidate = (typeof data === 'string' ? data : data.text || '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');
        const quality = validateTextQuality(candidate);

        if (quality.isValid) {
          textContent = candidate;
          pageCount = data.numpages || 1;
          info = data.info || {};
          selectedEngine = 'PDFParse Class';
          primaryTextLength = candidate.length;
          primaryPrintableRatio = quality.printableRatio;
        }
      } catch (e: any) {
        console.warn('[PDF Extractor] PDFParse Class engine failed:', e.message);
      }
    }

    let fallbackUsed = false;
    let fallbackTextLength = 0;
    let fallbackPrintableRatio = 0;

    // Engine 3: Safe Decompressed FlateDecode Raw PDF Fallback
    if (!textContent) {
      const rawFallback = safeFallbackRawPdfStreamExtractor(pdfBuffer);
      const rawQuality = validateTextQuality(rawFallback);

      if (rawQuality.isValid) {
        textContent = rawFallback;
        selectedEngine = 'Safe Decompressed FlateDecode Fallback';
        fallbackUsed = true;
        fallbackTextLength = rawFallback.length;
        fallbackPrintableRatio = rawQuality.printableRatio;
      }
    }

    // Normalize and clean up whitespace
    const cleanText = (textContent || '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const textQuality = validateTextQuality(cleanText);
    const hasExtractableText = textQuality.isValid;

    if (fileName?.toLowerCase().includes('wahada')) {
      console.log('=== WAHADA PDF EXTRACTION DEBUG ===', {
        fileName: fileName || 'Wahada_Bank.pdf',
        bufferSize: pdfBuffer.length,
        primaryExtractor: selectedEngine,
        primaryTextLength,
        primaryPrintableRatio: primaryPrintableRatio.toFixed(3),
        primaryTextPreview: cleanText.slice(0, 200),
        fallbackTextLength,
        fallbackPrintableRatio: fallbackPrintableRatio.toFixed(3),
        finalAcceptedTextLength: cleanText.length,
        finalAcceptedTextPreview: cleanText.slice(0, 200),
        hasExtractableText,
      });
    } else {
      console.log('=== PDF EXTRACTION DIAGNOSTIC ===', {
        fileName: fileName || 'Unknown.pdf',
        bufferSize: pdfBuffer.length,
        primaryExtractor: selectedEngine,
        primaryTextLength,
        primaryPrintableRatio: primaryPrintableRatio.toFixed(3),
        primaryTextPreview: cleanText.slice(0, 150),
      });
    }

    return {
      text: hasExtractableText ? cleanText : '',
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
      numPages: 1,
      hasExtractableText: false,
      error: `Failed to extract text from PDF: ${errMessage}`,
    };
  }
}
