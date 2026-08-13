import fs from 'fs';

function extractTextFromRawPdfBuffer(pdfBuffer: Buffer): string {
  const content = pdfBuffer.toString('binary');
  const textMatches: string[] = [];

  // Match text in (string) Tj or [(string)] TJ or /BT ... /ET blocks
  const btBlockRegex = /\/BT[\s\S]*?\/ET/g;
  const btBlocks = content.match(btBlockRegex) || [];

  for (const block of btBlocks) {
    const stringLiterals = block.match(/\(([^()]+)\)/g);
    if (stringLiterals) {
      for (const str of stringLiterals) {
        const clean = str.slice(1, -1).replace(/\\([()\\])/g, '$1').trim();
        if (clean.length > 0 && !/^[\d\s./\\-]+$/.test(clean)) {
          textMatches.push(clean);
        }
      }
    }
  }

  // Fallback: If no BT blocks found, search all parentheses string literals in the PDF
  if (textMatches.length < 5) {
    const stringLiterals = content.match(/\(([^()]{3,})\)/g) || [];
    for (const str of stringLiterals) {
      const clean = str.slice(1, -1).replace(/\\([()\\])/g, '$1').trim();
      if (clean.length > 2 && /^[a-zA-Z0-9\s.,!?:;%$/&'()-]+$/.test(clean)) {
        textMatches.push(clean);
      }
    }
  }

  return textMatches.join(' ');
}

async function testRawPdfStream() {
  const filePath = 'D:\\Downloads\\new-case-study\\DevOps.pdf';
  const buffer = fs.readFileSync(filePath);

  const rawText = extractTextFromRawPdfBuffer(buffer);
  console.log('Raw PDF Stream Text Extracted Length:', rawText.length);
  console.log('First 400 chars:\n', rawText.slice(0, 400));
}

testRawPdfStream().catch(console.error);
