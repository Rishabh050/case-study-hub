import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { extractTextFromPDF } from '../lib/pdf/extractor';
import { extractMetadataFromText } from '../lib/ai/metadata-extractor';

const TEST_DIR = 'D:\\Downloads\\new-case-study';

async function testWahadaPipeline() {
  console.log('==================================================');
  console.log('=== WAHADA_BANK.PDF PIPELINE AUDIT & TEST ===');
  console.log('==================================================\n');

  const fileName = 'Wahada_Bank.pdf';
  const filePath = path.join(TEST_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }

  const pdfBuffer = fs.readFileSync(filePath);

  // 1. PDF Extraction
  const pdfResult = await extractTextFromPDF(pdfBuffer, fileName);

  console.log('\n=== WAHADA PDF EXTRACTION DEBUG ===', {
    fileName,
    bufferSize: pdfBuffer.length,
    primaryTextLength: pdfResult.text.length,
    hasExtractableText: pdfResult.hasExtractableText,
    first500Chars: pdfResult.text.slice(0, 500),
  });

  // 2. Metadata Extraction
  const metadata = await extractMetadataFromText(pdfResult.text, fileName);

  console.log('\n=== WAHADA METADATA DEBUG ===', {
    title: metadata.title,
    client: metadata.client,
    industry: metadata.industry,
    geography: metadata.geography,
    descriptionLength: metadata.description?.length || 0,
    technologiesCount: metadata.technologies.length,
    servicesCount: metadata.services.length,
  });

  console.log('\nFULL EXTRACTED METADATA JSON:');
  console.log(JSON.stringify(metadata, null, 2));
}

testWahadaPipeline().catch(console.error);
