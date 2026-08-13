import fs from 'fs';

// Polyfill DOMMatrix for pdfjs-dist in Node environment if missing
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

async function testPDFParseClass() {
  const filePath = 'D:\\Downloads\\new-case-study\\DevOps.pdf';
  const buffer = fs.readFileSync(filePath);

  const pdfParseModule = require('pdf-parse');
  console.log('Using pdfParseModule.PDFParse class...');

  const uint8 = new Uint8Array(buffer);
  const parser = new pdfParseModule.PDFParse(uint8);

  if (typeof parser.load === 'function') {
    await parser.load();
  }

  const textRes = await parser.getText();
  console.log('\n--- SUCCESS ---');
  console.log('Result type:', typeof textRes);
  const rawText = typeof textRes === 'string' ? textRes : textRes?.text || '';
  console.log('Text Length:', rawText.length, 'characters');
  console.log('First 400 chars:\n', rawText.slice(0, 400));
}

testPDFParseClass().catch(console.error);
