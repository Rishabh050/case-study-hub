const fs = require('fs');
const path = require('path');
const { extractTextFromPDF } = require('../lib/pdf/extractor');

const SOURCE_DIR = 'D:\\Downloads\\new-case-study';

interface AuditItem {
  index: number;
  filename: string;
  fileSizeMb: number;
  numPages: number;
  success: boolean;
  textLength: number;
  durationMs: number;
  hasMeaningfulText: boolean;
  classification: 'Text-Heavy' | 'Visually Designed' | 'Chart-Heavy' | 'Screenshot-Heavy' | 'Table-Heavy';
  metricsCount: number;
  hasChallenge: boolean;
  hasSolution: boolean;
  hasTechnologies: boolean;
  isIncompleteOrSuspicious: boolean;
  quality: 'GOOD' | 'PARTIAL' | 'POOR' | 'FAILED';
  notes: string;
}

const techKeywords = [
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'React', 'Next.js', 'Node.js',
  'Python', 'TypeScript', 'PostgreSQL', 'MongoDB', 'Redis', 'Kafka', 'Odoo',
  'LiveKit', 'GraphQL', 'REST API', 'Power Apps', 'Flutter', 'Swift', 'Java'
];

async function runCoverageAudit() {
  console.log('=== Starting Phase 3B: Full 61-PDF Extraction Coverage Audit (READ-ONLY) ===\n');

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Source directory not found at: ${SOURCE_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(SOURCE_DIR)
    .filter((f: string) => f.toLowerCase().endsWith('.pdf'))
    .sort();

  console.log(`Discovered ${files.length} PDF files in ${SOURCE_DIR}.\n`);

  const auditList: AuditItem[] = [];
  let totalDurationMs = 0;

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filePath = path.join(SOURCE_DIR, filename);
    const stats = fs.statSync(filePath);
    const fileSizeMb = parseFloat((stats.size / (1024 * 1024)).toFixed(2));

    const fileBuffer = fs.readFileSync(filePath);

    const startTime = Date.now();
    const extraction = await extractTextFromPDF(fileBuffer);
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    totalDurationMs += durationMs;

    const rawText = extraction.text || '';
    const textLength = rawText.length;
    const lowerText = rawText.toLowerCase();

    // Quantitative metrics count
    const metricRegex = /([+|-]?\d+(?:\.\d+)?%|\$\d+(?:\.\d+)?[kMBN]?|\d+\s*(?:sec|seconds|ms|hrs|hours|days|x|fold))/gi;
    const metricsMatches = rawText.match(metricRegex) || [];
    const metricsCount = new Set(metricsMatches.map((m: string) => m.trim())).size;

    // Detected sections
    const hasChallenge = /(?:challenge|problem|background|the need)/i.test(rawText);
    const hasSolution = /(?:solution|approach|what we built|architecture)/i.test(rawText);
    const hasTechnologies = techKeywords.some((tech) =>
      new RegExp(`\\b${tech.replace('.', '\\.')}\\b`, 'i').test(rawText)
    );

    // Document type classification heuristics
    let classification: AuditItem['classification'] = 'Visually Designed';
    if (lowerText.includes('table') || lowerText.includes('module') || lowerText.includes('comparison')) {
      classification = 'Table-Heavy';
    } else if (lowerText.includes('app') || lowerText.includes('screen') || lowerText.includes('ui')) {
      classification = 'Screenshot-Heavy';
    } else if (metricsCount >= 3 || lowerText.includes('%') || lowerText.includes('$')) {
      classification = 'Chart-Heavy';
    } else if (textLength > 6000) {
      classification = 'Text-Heavy';
    }

    const hasMeaningfulText = textLength > 50;
    const isIncompleteOrSuspicious = textLength < 300 || extraction.error != null;

    let quality: AuditItem['quality'] = 'GOOD';
    let notes = 'Normal text stream extracted cleanly';

    if (extraction.error || textLength === 0) {
      quality = 'FAILED';
      notes = extraction.error || 'Zero bytes of text extracted';
    } else if (textLength < 100) {
      quality = 'POOR';
      notes = 'Very low text length; visual raster image format';
    } else if (textLength < 500 || !hasChallenge || !hasSolution) {
      quality = 'PARTIAL';
      notes = 'Partial text stream; missing explicit structural section headings';
    }

    auditList.push({
      index: i + 1,
      filename,
      fileSizeMb,
      numPages: extraction.numPages || 1,
      success: extraction.error == null,
      textLength,
      durationMs,
      hasMeaningfulText,
      classification,
      metricsCount,
      hasChallenge,
      hasSolution,
      hasTechnologies,
      isIncompleteOrSuspicious,
      quality,
      notes,
    });
  }

  // Summary Metrics
  const totalPdfs = auditList.length;
  const goodCount = auditList.filter((a) => a.quality === 'GOOD').length;
  const partialCount = auditList.filter((a) => a.quality === 'PARTIAL').length;
  const poorCount = auditList.filter((a) => a.quality === 'POOR').length;
  const failedCount = auditList.filter((a) => a.quality === 'FAILED').length;

  const usablePercentage = (((goodCount + partialCount) / totalPdfs) * 100).toFixed(1);
  const avgDurationMs = Math.round(totalDurationMs / totalPdfs);

  const sortedByTime = [...auditList].sort((a, b) => b.durationMs - a.durationMs);
  const sortedBySize = [...auditList].sort((a, b) => b.fileSizeMb - a.fileSizeMb);

  const slowestPdf = sortedByTime[0];
  const largestPdf = sortedBySize[0];

  const summary = {
    totalPdfs,
    goodCount,
    partialCount,
    poorCount,
    failedCount,
    usablePercentage: `${usablePercentage}%`,
    totalDurationMs,
    avgDurationMs: `${avgDurationMs} ms`,
    slowestPdf: { filename: slowestPdf.filename, durationMs: slowestPdf.durationMs },
    largestPdf: { filename: largestPdf.filename, fileSizeMb: `${largestPdf.fileSizeMb} MB` },
  };

  console.log('=== OVERALL AUDIT SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));

  // Write full audit artifact
  const outPath = path.join(__dirname, 'phase3b_coverage_report.json');
  fs.writeFileSync(outPath, JSON.stringify({ summary, auditList }, null, 2));
  console.log(`\nSaved Phase 3B audit report JSON to: ${outPath}`);
}

runCoverageAudit().catch((err) => {
  console.error('Fatal error during Phase 3B coverage audit:', err);
  process.exit(1);
});
