import fs from 'fs';
import path from 'path';
import { extractTextFromPDF } from '../lib/pdf/extractor';

const TEST_DIR = 'D:\\Downloads\\new-case-study';

async function inspectDevOpsAndAI() {
  const files = [
    'DevOps.pdf',
    'AI-Assisted Design Validation & Autonomous Testing Workflows.pdf',
  ];

  for (const fileName of files) {
    const filePath = path.join(TEST_DIR, fileName);
    const buffer = fs.readFileSync(filePath);
    const pdfExt = await extractTextFromPDF(buffer, fileName);

    console.log(`\n==================================================`);
    console.log(`=== TEXT FOR: ${fileName} ===`);
    console.log(`==================================================`);
    console.log(pdfExt.text.slice(0, 3000));
  }
}

inspectDevOpsAndAI().catch(console.error);
