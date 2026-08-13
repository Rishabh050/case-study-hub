import fs from 'fs';

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
  if (controlCount > 0) {
    return { isValid: false, printableRatio, replacementCount, controlCount, reason: `Contains binary control characters (${controlCount})` };
  }
  if (printableRatio < 0.85) {
    return { isValid: false, printableRatio, replacementCount, controlCount, reason: `Low printable ratio (${(printableRatio * 100).toFixed(1)}%)` };
  }

  return { isValid: true, printableRatio, replacementCount, controlCount };
}

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

async function testPdfFiles() {
  const files = [
    'D:\\Downloads\\new-case-study\\DevOps.pdf',
    'D:\\Downloads\\new-case-study\\AI-Assisted Design Validation & Autonomous Testing Workflows.pdf',
  ];

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    console.log('\n======================================');
    console.log('Testing File:', file);
    const buffer = fs.readFileSync(file);
    const pdfParseModule = require('pdf-parse');

    let rawText = '';
    let engine = 'None';

    if (pdfParseModule && pdfParseModule.PDFParse) {
      const parser = new pdfParseModule.PDFParse(new Uint8Array(buffer));
      if (typeof parser.load === 'function') await parser.load();
      const res = await parser.getText();
      rawText = typeof res === 'string' ? res : res?.text || '';
      engine = 'PDFParse Class';
    }

    const quality = validateTextQuality(rawText);
    console.log('Engine:', engine, '| Text Length:', rawText.length, '| Quality Valid:', quality.isValid, '| Ratio:', quality.printableRatio.toFixed(3));

    // Test Title Extraction
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    let titleCandidate = '';

    for (const line of lines) {
      if (isValidTitle(line) && line.length > 5 && !line.toLowerCase().includes('industry') && !line.toLowerCase().includes('client')) {
        titleCandidate = line;
        break;
      }
    }

    console.log('Extracted Valid Title Candidate:', titleCandidate);
  }
}

testPdfFiles().catch(console.error);
