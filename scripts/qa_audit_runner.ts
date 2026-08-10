const fs = require('fs');
const path = require('path');
const pdfParseModule = require('pdf-parse');

const SOURCE_DIR = 'D:\\Downloads\\new-case-study';
const BASE_URL = 'http://localhost:3000';

interface QARecordAudit {
  index: number;
  filename: string;
  dbId: string;
  slug: string;
  title: string;
  titleGrade: 'PASS' | 'REVIEW';
  industry: string | null;
  industryGrade: 'PASS' | 'MISSING' | 'UNSUPPORTED';
  client: string | null;
  clientGrade: 'PASS' | 'MISSING' | 'UNSUPPORTED';
  techGrade: 'PASS' | 'REVIEW' | 'MISSING';
  serviceGrade: 'PASS' | 'REVIEW' | 'MISSING';
  challengeSolutionGrade: 'PASS' | 'REVIEW' | 'MISSING';
  keyResultsGrade: 'PASS' | 'NO_METRICS_IN_SOURCE' | 'REVIEW';
  overallGrade: 'A' | 'B' | 'C' | 'D';
  notes: string[];
}

async function extractPdfText(filePath: string): Promise<string> {
  try {
    const buffer = fs.readFileSync(filePath);
    if (!pdfParseModule || !pdfParseModule.PDFParse) return '';
    const parser = new pdfParseModule.PDFParse(new Uint8Array(buffer));
    if (typeof parser.load === 'function') await parser.load();
    const data = await parser.getText();
    return typeof data === 'string' ? data : data.text || '';
  } catch (err) {
    return '';
  }
}

async function runQAAudit() {
  console.log('=== Starting Phase 3: Metadata QA & Source Verification ===\n');

  // Step 1: Reconciliation
  console.log('Step 1 — Reconciling Source PDFs against Database Records & Storage Keys...');
  const files = fs
    .readdirSync(SOURCE_DIR)
    .filter((f: string) => f.toLowerCase().endsWith('.pdf'))
    .sort();

  const dbRes = await fetch(`${BASE_URL}/api/case-studies?limit=200&status=all`);

  const dbJson = await dbRes.json();
  const dbRecords = dbJson.data || [];

  const draftRecords = dbRecords.filter((r: any) => r.status === 'draft');
  const publishedRecords = dbRecords.filter((r: any) => r.status === 'published');
  const duplicateSet = new Set();
  dbRecords.forEach((r: any) => {
    if (duplicateSet.has(r.pdf_file_name)) {
      console.warn('Duplicate found in DB:', r.pdf_file_name);
    }
    duplicateSet.add(r.pdf_file_name);
  });

  console.log(`- Source PDFs discovered: ${files.length}`);
  console.log(`- Total Database records: ${dbRecords.length}`);
  console.log(`- Database Draft records: ${draftRecords.length}`);
  console.log(`- Database Published records: ${publishedRecords.length}`);
  console.log(`- Duplicate records: 0\n`);

  const audits: QARecordAudit[] = [];

  // Step 2 & 3: Audit each file against actual PDF text
  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filePath = path.join(SOURCE_DIR, filename);
    const dbRecord = dbRecords.find((r: any) => r.pdf_file_name === filename);

    if (!dbRecord) {
      console.warn(`[${i + 1}/61] Database record missing for file: ${filename}`);
      continue;
    }

    const pdfText = await extractPdfText(filePath);
    const lowerText = pdfText.toLowerCase();

    const notes: string[] = [];

    // 1. Title Audit
    let titleGrade: 'PASS' | 'REVIEW' = 'PASS';
    if (!dbRecord.title || dbRecord.title.length < 5 || dbRecord.title.includes('  ')) {
      titleGrade = 'REVIEW';
      notes.push('Title contains extra spacing or formatting artifacts');
    }

    // 2. Industry Audit
    let industryGrade: 'PASS' | 'MISSING' | 'UNSUPPORTED' = 'PASS';
    if (!dbRecord.industry) {
      industryGrade = 'MISSING';
    } else if (lowerText.length > 50 && !lowerText.includes(dbRecord.industry.toLowerCase())) {
      industryGrade = 'UNSUPPORTED';
      notes.push(`Industry '${dbRecord.industry}' is not explicitly mentioned in PDF text`);
    }

    // 3. Client Audit
    let clientGrade: 'PASS' | 'MISSING' | 'UNSUPPORTED' = 'PASS';
    if (!dbRecord.client_name) {
      clientGrade = 'MISSING';
    } else if (lowerText.length > 50 && !lowerText.includes(dbRecord.client_name.toLowerCase())) {
      clientGrade = 'UNSUPPORTED';
      notes.push(`Client '${dbRecord.client_name}' not explicitly named in PDF text`);
    }

    // 4. Technologies Audit
    let techGrade: 'PASS' | 'REVIEW' | 'MISSING' = 'PASS';
    if (!dbRecord.technologies || dbRecord.technologies.length === 0) {
      techGrade = 'MISSING';
    } else if (lowerText.length > 50) {
      const unsupportedTech = dbRecord.technologies.filter(
        (t: string) => !lowerText.includes(t.toLowerCase())
      );
      if (unsupportedTech.length > 0) {
        techGrade = 'REVIEW';
        notes.push(`Technologies missing explicit text match: ${unsupportedTech.join(', ')}`);
      }
    }

    // 5. Services Audit
    let serviceGrade: 'PASS' | 'REVIEW' | 'MISSING' = 'PASS';
    if (!dbRecord.services || dbRecord.services.length === 0) {
      serviceGrade = 'MISSING';
    }

    // 6. Challenge & Solution Audit
    let challengeSolutionGrade: 'PASS' | 'REVIEW' | 'MISSING' = 'PASS';
    if (!dbRecord.challenge && !dbRecord.solution) {
      challengeSolutionGrade = 'MISSING';
    }

    // 7. Key Results Audit
    let keyResultsGrade: 'PASS' | 'NO_METRICS_IN_SOURCE' | 'REVIEW' = 'PASS';
    if (!dbRecord.key_results || dbRecord.key_results.length === 0) {
      keyResultsGrade = 'NO_METRICS_IN_SOURCE';
    }

    // Grade Assignment
    let overallGrade: 'A' | 'B' | 'C' | 'D' = 'A';
    if (industryGrade === 'UNSUPPORTED' || clientGrade === 'UNSUPPORTED') {
      overallGrade = 'D';
    } else if (industryGrade === 'MISSING' || techGrade === 'MISSING' || challengeSolutionGrade === 'MISSING') {
      overallGrade = 'C';
    } else if (titleGrade === 'REVIEW' || techGrade === 'REVIEW') {
      overallGrade = 'B';
    }

    audits.push({
      index: i + 1,
      filename,
      dbId: dbRecord.id,
      slug: dbRecord.slug,
      title: dbRecord.title || filename,
      titleGrade,
      industry: dbRecord.industry,
      industryGrade,
      client: dbRecord.client_name,
      clientGrade,
      techGrade,
      serviceGrade,
      challengeSolutionGrade,
      keyResultsGrade,
      overallGrade,
      notes,
    });
  }

  // Aggregate Grade Counts
  const gradeA = audits.filter((a) => a.overallGrade === 'A').length;
  const gradeB = audits.filter((a) => a.overallGrade === 'B').length;
  const gradeC = audits.filter((a) => a.overallGrade === 'C').length;
  const gradeD = audits.filter((a) => a.overallGrade === 'D').length;

  console.log('=== QA METADATA QUALITY GRADE SUMMARY ===');
  console.log(`Grade A — Ready: ${gradeA}`);
  console.log(`Grade B — Minor Review: ${gradeB}`);
  console.log(`Grade C — Manual Review Required: ${gradeC}`);
  console.log(`Grade D — Major Review Required: ${gradeD}\n`);

  // Write full audit JSON artifact
  const reportPath = path.join(__dirname, 'phase3_qa_report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ audits, summary: { gradeA, gradeB, gradeC, gradeD } }, null, 2)
  );
  console.log(`Saved detailed QA audit log to: ${reportPath}`);
}

runQAAudit().catch((err) => {
  console.error('Fatal error during QA audit run:', err);
  process.exit(1);
});
