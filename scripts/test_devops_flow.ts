import fs from 'fs';
import path from 'path';
import { extractTextFromPDF } from '../lib/pdf/extractor';
import { extractMetadataFromText } from '../lib/ai/metadata-extractor';

async function testUploadFlow() {
  const LOCAL_SOURCE_DIR = 'D:\\Downloads\\new-case-study';
  const files = fs.readdirSync(LOCAL_SOURCE_DIR);
  const devopsFile = files.find(f => f.toLowerCase().includes('devops')) || files[0];
  console.log('Testing with file:', devopsFile);

  const filePath = path.join(LOCAL_SOURCE_DIR, devopsFile);
  const buffer = fs.readFileSync(filePath);

  const pdfRes = await extractTextFromPDF(buffer);
  console.log('\n--- PDF Text Extraction Result ---');
  console.log('Page Count:', pdfRes.numPages);
  console.log('Has Extractable Text:', pdfRes.hasExtractableText);
  console.log('Extracted Text Length:', pdfRes.text.length, 'characters');
  console.log('Text Snippet (first 400 chars):\n', pdfRes.text.slice(0, 400));

  const metaRes = await extractMetadataFromText(pdfRes.text, devopsFile);
  console.log('\n--- AI Metadata Extraction Result ---');
  console.log(JSON.stringify(metaRes, null, 2));
}

testUploadFlow();
