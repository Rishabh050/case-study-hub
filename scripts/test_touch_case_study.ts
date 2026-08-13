import fs from 'fs';
import path from 'path';
import { extractTextFromPDF } from '../lib/pdf/extractor';
import { extractMetadataFromText } from '../lib/ai/metadata-extractor';

async function testTouchCaseStudy() {
  const dir = 'D:\\Downloads\\new-case-study';
  if (!fs.existsSync(dir)) {
    console.log('Directory not found:', dir);
    return;
  }

  const files = fs.readdirSync(dir);
  console.log('Files in directory:', files.filter(f => f.endsWith('.pdf')));

  const touchFile = files.find(f => f.toLowerCase().includes('touch')) || files.find(f => f.toLowerCase().includes('devops')) || files[0];
  console.log('\nTesting with file:', touchFile);

  const filePath = path.join(dir, touchFile);
  const buffer = fs.readFileSync(filePath);

  const pdfRes = await extractTextFromPDF(buffer);
  console.log('\n=== STEP 1 PDF TEXT EXTRACTION ===');
  console.log('Page count:', pdfRes.numPages);
  console.log('Has extractable text:', pdfRes.hasExtractableText);
  console.log('Text length:', pdfRes.text.length, 'characters');
  console.log('First 500 chars:\n', pdfRes.text.slice(0, 500));

  const meta = await extractMetadataFromText(pdfRes.text, touchFile);
  console.log('\n=== STEP 2 EXTRACTED METADATA ===');
  console.log(JSON.stringify(meta, null, 2));
}

testTouchCaseStudy();
