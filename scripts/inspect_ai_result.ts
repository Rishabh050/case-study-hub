import fs from 'fs';
import path from 'path';
import { extractTextFromPDF } from '../lib/pdf/extractor';

const TEST_DIR = 'D:\\Downloads\\new-case-study';

async function inspectAIResult() {
  const fileName = 'AI-Assisted Design Validation & Autonomous Testing Workflows.pdf';
  const filePath = path.join(TEST_DIR, fileName);
  const buffer = fs.readFileSync(filePath);
  const pdfExt = await extractTextFromPDF(buffer, fileName);

  const idx = pdfExt.text.indexOf('Result');
  if (idx !== -1) {
    console.log('=== RESULT SECTION IN AI-ASSISTED PDF ===');
    console.log(pdfExt.text.slice(idx));
  }
}

inspectAIResult().catch(console.error);
