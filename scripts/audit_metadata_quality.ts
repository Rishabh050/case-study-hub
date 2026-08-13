import fs from 'fs';
import path from 'path';
import { extractTextFromPDF } from '../lib/pdf/extractor';
import { extractMetadataFromText } from '../lib/ai/metadata-extractor';

const TEST_DIR = 'D:\\Downloads\\new-case-study';

async function auditPdfMetadata() {
  console.log('==================================================');
  console.log('=== METADATA EXTRACTION QUALITY AUDIT ON REAL PDFs ===');
  console.log('==================================================\n');

  if (!fs.existsSync(TEST_DIR)) {
    console.error('Test directory not found:', TEST_DIR);
    return;
  }

  const files = fs.readdirSync(TEST_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));
  console.log(`Found ${files.length} PDF files in ${TEST_DIR}:\n`);

  for (const fileName of files) {
    const filePath = path.join(TEST_DIR, fileName);
    const buffer = fs.readFileSync(filePath);

    console.log(`\n--------------------------------------------------`);
    console.log(`FILE: ${fileName} (${buffer.length} bytes)`);

    const pdfExtraction = await extractTextFromPDF(buffer, fileName);
    console.log(`Extracted Text Length: ${pdfExtraction.text.length} chars | Has Text: ${pdfExtraction.hasExtractableText}`);

    if (pdfExtraction.text.length > 0) {
      console.log(`First 300 chars of PDF text:\n"${pdfExtraction.text.slice(0, 300).replace(/\n/g, ' ')}"`);
    }

    const metadata = await extractMetadataFromText(pdfExtraction.text, fileName);
    console.log(`\nEXTRACTED METADATA FOR "${fileName}":`);
    console.log(JSON.stringify(metadata, null, 2));
  }
}

auditPdfMetadata().catch(console.error);
