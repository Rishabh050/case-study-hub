import fs from 'fs';
import path from 'path';

async function diagnoseWahadaPdf() {
  console.log('=== WAHADA PDF EXTRACTION DIAGNOSTIC ===\n');

  const pdfPath = 'D:\\Downloads\\new-case-study\\Wahada_Bank.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error('File not found at:', pdfPath);
    return;
  }

  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfParseModule = require('pdf-parse');

  let rawText = '';
  if (pdfParseModule.PDFParse) {
    const parser = new pdfParseModule.PDFParse(new Uint8Array(pdfBuffer));
    await parser.load();
    const data = await parser.getText();
    rawText = typeof data === 'string' ? data : data.text || '';
  }

  console.log(`Raw pdf-parse text length: ${rawText.length} chars`);
  console.log(`First 500 chars:\n"${rawText.slice(0, 500)}"\n`);

  let printableCount = 0;
  let replacementCount = 0;
  let controlCount = 0;
  const controlChars: { char: string; code: number; index: number }[] = [];

  for (let i = 0; i < rawText.length; i++) {
    const char = rawText.charAt(i);
    const code = rawText.charCodeAt(i);

    if (char === '\uFFFD') {
      replacementCount++;
    } else if (code === 0 || (code < 32 && code !== 9 && code !== 10 && code !== 13)) {
      controlCount++;
      controlChars.push({ char, code, index: i });
    } else if ((code >= 32 && code <= 126) || code >= 160) {
      printableCount++;
    }
  }

  const printableRatio = rawText.length > 0 ? printableCount / rawText.length : 0;

  console.log('QUALITY METRICS BEFORE CLEANUP:', {
    totalChars: rawText.length,
    printableCount,
    replacementCount,
    controlCount,
    printableRatio: printableRatio.toFixed(3),
    controlCharsSample: controlChars.slice(0, 10),
  });

  // Test cleaning control characters (\f \v etc.)
  const sanitizedText = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');
  let sanPrintable = 0;
  let sanControl = 0;
  for (let i = 0; i < sanitizedText.length; i++) {
    const code = sanitizedText.charCodeAt(i);
    if (code === 0 || (code < 32 && code !== 9 && code !== 10 && code !== 13)) {
      sanControl++;
    } else if ((code >= 32 && code <= 126) || code >= 160) {
      sanPrintable++;
    }
  }

  console.log('\nQUALITY METRICS AFTER SANITIZING CONTROL CHARS:', {
    sanitizedLength: sanitizedText.length,
    sanPrintable,
    sanControl,
    sanPrintableRatio: (sanPrintable / sanitizedText.length).toFixed(3),
  });
}

diagnoseWahadaPdf().catch(console.error);
