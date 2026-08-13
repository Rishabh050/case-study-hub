import fs from 'fs';

// Polyfill DOMMatrix for pdfjs-dist
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

function validateTextQuality(text: string) {
  if (!text || typeof text !== 'string') {
    return { isValid: false, printableRatio: 0, replacementCount: 0, controlCount: 0 };
  }

  let printableCount = 0;
  let replacementCount = 0;
  let controlCount = 0;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const char = text.charAt(i);

    if (char === '') {
      replacementCount++;
    } else if (code === 0 || (code < 32 && code !== 9 && code !== 10 && code !== 13)) {
      controlCount++;
    } else if (code >= 32 && code <= 126) {
      printableCount++;
    } else if (code >= 160) {
      // Extended printable / UTF-8
      printableCount++;
    }
  }

  const printableRatio = text.length > 0 ? printableCount / text.length : 0;
  const isValid = text.length >= 20 && printableRatio >= 0.80 && replacementCount <= 5 && controlCount === 0;

  return { isValid, printableRatio, replacementCount, controlCount };
}

async function testExtractionEngines() {
  const filePath = 'D:\\Downloads\\new-case-study\\DevOps.pdf';
  const buffer = fs.readFileSync(filePath);

  console.log('--- TEST Engine 1: pdf-parse default function ---');
  try {
    const pdfParseModule = require('pdf-parse');
    let text1 = '';
    if (typeof pdfParseModule === 'function') {
      const res = await pdfParseModule(buffer);
      text1 = res.text || '';
    } else if (pdfParseModule && typeof pdfParseModule.default === 'function') {
      const res = await pdfParseModule.default(buffer);
      text1 = res.text || '';
    }
    const q1 = validateTextQuality(text1);
    console.log('Engine 1 Text Length:', text1.length, 'Quality:', q1);
  } catch (e: any) {
    console.log('Engine 1 Failed:', e.message);
  }

  console.log('--- TEST Engine 2: PDFParse Class ---');
  try {
    const pdfParseModule = require('pdf-parse');
    if (pdfParseModule && pdfParseModule.PDFParse) {
      const parser = new pdfParseModule.PDFParse(new Uint8Array(buffer));
      if (typeof parser.load === 'function') await parser.load();
      const res = await parser.getText();
      const text2 = typeof res === 'string' ? res : res?.text || '';
      const q2 = validateTextQuality(text2);
      console.log('Engine 2 Text Length:', text2.length, 'Quality:', q2);
      console.log('First 200 chars:\n', text2.slice(0, 200));
    }
  } catch (e: any) {
    console.log('Engine 2 Failed:', e.message);
  }
}

testExtractionEngines().catch(console.error);
