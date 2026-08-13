import fs from 'fs';
import { extractTextFromPDF } from '../lib/pdf/extractor';
import { extractMetadataFromText } from '../lib/ai/metadata-extractor';

async function testPdfTextExtraction() {
  const filePath = 'D:\\Downloads\\new-case-study\\AI ML Projects Portfolio _ Case Studies.pdf';
  console.log('Testing PDF Text Extraction for:', filePath);

  const buffer = fs.readFileSync(filePath);
  const result = await extractTextFromPDF(buffer);

  console.log('\n--- Text Extraction Result ---');
  console.log('Page Count:', result.numPages);
  console.log('Has Extractable Text:', result.hasExtractableText);
  console.log('Text Length:', result.text.length, 'characters');
  console.log('Text Snippet:\n', result.text.slice(0, 500));

  const metadata = await extractMetadataFromText(result.text, 'AI ML Projects Portfolio _ Case Studies.pdf');
  console.log('\n--- Extracted Metadata ---');
  console.log(JSON.stringify(metadata, null, 2));
}

testPdfTextExtraction();
