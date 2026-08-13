import fs from 'fs';
import path from 'path';
import { extractTextFromPDF } from '../lib/pdf/extractor';

const TEST_DIR = 'D:\\Downloads\\new-case-study';

async function auditWahadaText() {
  console.log('=== AUDITING WAHADA_BANK.PDF TEXT MATCHES ===\n');
  const filePath = path.join(TEST_DIR, 'Wahada_Bank.pdf');
  const buffer = fs.readFileSync(filePath);
  const pdfExt = await extractTextFromPDF(buffer, 'Wahada_Bank.pdf');

  console.log('Full Wahada_Bank.pdf text:\n');
  console.log(pdfExt.text);
}

auditWahadaText().catch(console.error);
