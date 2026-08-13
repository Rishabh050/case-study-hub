import fs from 'fs';
import path from 'path';
import { extractTextFromPDF } from '../lib/pdf/extractor';

const TEST_DIR = 'D:\\Downloads\\new-case-study';

async function inspectTexts() {
  const files = [
    'DevOps.pdf',
    'AI-Assisted Design Validation & Autonomous Testing Workflows.pdf',
    'Wahada_Bank.pdf',
    'Touch-case-study-2.pdf',
  ];

  for (const fileName of files) {
    const filePath = path.join(TEST_DIR, fileName);
    if (!fs.existsSync(filePath)) continue;

    const buffer = fs.readFileSync(filePath);
    const pdfExt = await extractTextFromPDF(buffer, fileName);

    console.log(`\n==================================================`);
    console.log(`=== FULL EXTRACTED TEXT FOR: ${fileName} ===`);
    console.log(`==================================================`);
    console.log(pdfExt.text);
  }
}

inspectTexts().catch(console.error);
