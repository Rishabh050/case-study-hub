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

// Disable worker requirement globally
(globalThis as any).pdfjsWorker = {
  WorkerMessageHandler: {},
};

async function testPdfGlobalWorker() {
  const filePath = 'D:\\Downloads\\new-case-study\\DevOps.pdf';
  const buffer = fs.readFileSync(filePath);

  const pdfParseModule = require('pdf-parse');
  let textContent = '';

  try {
    if (pdfParseModule && pdfParseModule.PDFParse) {
      const parser = new pdfParseModule.PDFParse(new Uint8Array(buffer));
      if (typeof parser.load === 'function') await parser.load();
      const data = await parser.getText();
      textContent = typeof data === 'string' ? data : data.text || '';
    }
  } catch (e: any) {
    console.log('Class API error:', e.message);
  }

  if (!textContent && typeof pdfParseModule === 'function') {
    const data = await pdfParseModule(buffer);
    textContent = data.text || '';
  }

  console.log('Extracted text length:', textContent.length);
}

testPdfGlobalWorker().catch(console.error);
