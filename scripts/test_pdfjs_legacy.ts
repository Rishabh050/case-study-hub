import fs from 'fs';

// Polyfill DOMMatrix
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

async function testPdfParseDirect() {
  const filePath = 'D:\\Downloads\\new-case-study\\DevOps.pdf';
  const buffer = fs.readFileSync(filePath);

  const pdfParseModule = require('pdf-parse');

  // Set global worker options if available
  try {
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    }
  } catch (e) {}

  const parser = new pdfParseModule.PDFParse(new Uint8Array(buffer));
  const data = await parser.getText();
  const text = typeof data === 'string' ? data : data.text || '';

  console.log('PDF Text extracted successfully! Length:', text.length);
}

testPdfParseDirect().catch(console.error);
