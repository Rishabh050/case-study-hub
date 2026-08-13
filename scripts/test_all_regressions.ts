import fs from 'fs';
import path from 'path';
import { extractTextFromPDF } from '../lib/pdf/extractor';
import { extractMetadataFromText } from '../lib/ai/metadata-extractor';

const TEST_DIR = 'D:\\Downloads\\new-case-study';

async function runRegressionTests() {
  console.log('==================================================');
  console.log('=== COMPLETE 4-FILE REGRESSION SUITE JSON OUTPUT ===');
  console.log('==================================================\n');

  const files = [
    'Wahada_Bank.pdf',
    'DevOps.pdf',
    'AI-Assisted Design Validation & Autonomous Testing Workflows.pdf',
    'Touch-case-study-2.pdf',
  ];

  for (const fileName of files) {
    const filePath = path.join(TEST_DIR, fileName);
    if (!fs.existsSync(filePath)) continue;

    const buffer = fs.readFileSync(filePath);
    const pdfExt = await extractTextFromPDF(buffer, fileName);
    const metadata = await extractMetadataFromText(pdfExt.text, fileName);

    console.log(`\n--------------------------------------------------`);
    console.log(`FILE: ${fileName}`);
    console.log(JSON.stringify(metadata, null, 2));
  }
}

runRegressionTests().catch(console.error);
