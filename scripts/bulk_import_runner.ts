const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'D:\\Downloads\\new-case-study';
const BASE_URL = 'http://localhost:3000';
const CONCURRENCY = 2; // Process 2 PDFs concurrently to avoid rate limits/overload

interface ProcessResult {
  index: number;
  filename: string;
  status: 'SUCCESS' | 'FAILED' | 'DUPLICATE';
  title?: string;
  hasDescription: boolean;
  hasIndustry: boolean;
  techCount: number;
  serviceCount: number;
  tagCount: number;
  hasClient: boolean;
  hasChallenge: boolean;
  hasSolution: boolean;
  resultCount: number;
  storageKey?: string;
  databaseId?: string;
  stageFailed?: string;
  error?: string;
}

async function checkExistingCaseStudies(): Promise<Set<string>> {
  try {
    const res = await fetch(`${BASE_URL}/api/case-studies?limit=200&status=`);
    if (!res.ok) return new Set();
    const json = await res.json();
    const existing = new Set<string>();
    (json.data || []).forEach((item: any) => {
      if (item.pdf_file_name) existing.add(item.pdf_file_name.toLowerCase());
      if (item.title) existing.add(item.title.toLowerCase());
    });
    return existing;
  } catch (err) {
    console.error('Error fetching existing records for duplicate check:', err);
    return new Set();
  }
}

async function processSinglePdf(filename: string, index: number, existingSet: Set<string>): Promise<ProcessResult> {
  const result: ProcessResult = {
    index,
    filename,
    status: 'FAILED',
    hasDescription: false,
    hasIndustry: false,
    techCount: 0,
    serviceCount: 0,
    tagCount: 0,
    hasClient: false,
    hasChallenge: false,
    hasSolution: false,
    resultCount: 0,
  };

  const filePath = path.join(SOURCE_DIR, filename);

  // Step 1: Duplicate Check
  if (existingSet.has(filename.toLowerCase())) {
    console.log(`[${index}/61] DUPLICATE DETECTED: ${filename}`);
    result.status = 'DUPLICATE';
    return result;
  }

  // Step 2: Validate File
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > 25 * 1024 * 1024) {
      result.stageFailed = 'Validation';
      result.error = `File size (${(stats.size / 1024 / 1024).toFixed(1)}MB) exceeds 25MB limit`;
      return result;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', blob, filename);

    // Step 3: B2 Upload & PDF Text Extraction via Server API
    const uploadRes = await fetch(`${BASE_URL}/api/upload/pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!uploadRes.ok) {
      const errJson = await uploadRes.json().catch(() => ({}));
      result.stageFailed = 'Upload & Extraction';
      result.error = errJson.error || `HTTP ${uploadRes.status} on /api/upload/pdf`;
      return result;
    }

    const uploadData = await uploadRes.json();
    result.storageKey = uploadData.storageKey;
    const extractedText = uploadData.extractedText || '';

    // Step 4: AI Metadata Extraction via Server API
    const aiRes = await fetch(`${BASE_URL}/api/ai/extract-metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: extractedText,
        fileName: filename,
      }),
    });

    if (!aiRes.ok) {
      const errJson = await aiRes.json().catch(() => ({}));
      result.stageFailed = 'AI Extraction';
      result.error = errJson.error || `HTTP ${aiRes.status} on /api/ai/extract-metadata`;
      return result;
    }

    const aiData = await aiRes.json();
    const meta = aiData.metadata || {};

    result.title = meta.title || filename.replace(/\.pdf$/i, '');
    result.hasDescription = Boolean(meta.description);
    result.hasIndustry = Boolean(meta.industry);
    result.techCount = (meta.technologies || []).length;
    result.serviceCount = (meta.services || []).length;
    result.tagCount = (meta.tags || []).length;
    result.hasClient = Boolean(meta.client_name);
    result.hasChallenge = Boolean(meta.challenge);
    result.hasSolution = Boolean(meta.solution);
    result.resultCount = (meta.key_results || []).length;

    // Step 5: Save as Draft to Supabase via Server API
    const draftPayload = {
      title: result.title,
      description: meta.description || null,
      industry: meta.industry || null,
      client_name: meta.client_name || null,
      challenge: meta.challenge || null,
      solution: meta.solution || null,
      technologies: meta.technologies || [],
      services: meta.services || [],
      tags: meta.tags || [],
      key_results: meta.key_results || [],
      pdf_file_name: filename,
      pdf_storage_key: uploadData.storageKey,
      status: 'draft', // STRICT RULE: MUST BE DRAFT
      featured: false,
    };

    const dbRes = await fetch(`${BASE_URL}/api/case-studies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draftPayload),
    });

    if (!dbRes.ok) {
      const errJson = await dbRes.json().catch(() => ({}));
      result.stageFailed = 'Database Draft Creation';
      result.error = errJson.error || `HTTP ${dbRes.status} on /api/case-studies`;
      return result;
    }

    const dbData = await dbRes.json();
    result.databaseId = dbData.data?.id;
    result.status = 'SUCCESS';
    existingSet.add(filename.toLowerCase());

    console.log(`[${index}/61] SUCCESS: ${filename} -> Draft ID: ${result.databaseId}`);
    return result;
  } catch (err: any) {
    result.stageFailed = 'Processing Exception';
    result.error = err.message || 'Unknown network error';
    console.error(`[${index}/61] FAILED: ${filename} - ${result.error}`);
    return result;
  }
}

async function runBulkImport() {
  console.log('=== Starting Phase 2: Processing 61 Case Study PDFs ===\n');

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Source directory ${SOURCE_DIR} does not exist!`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(SOURCE_DIR)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .sort();

  console.log(`Discovered ${files.length} PDF files in ${SOURCE_DIR}.\n`);

  const existingSet = await checkExistingCaseStudies();
  console.log(`Found ${existingSet.size} pre-existing records in database.\n`);

  const results: ProcessResult[] = [];

  // Controlled Concurrency Queue
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const batchPromises = batch.map((file, batchIdx) =>
      processSinglePdf(file, i + batchIdx + 1, existingSet)
    );
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  console.log('\n=== All 61 PDFs Processed. Generating Reconciliation Report ===\n');

  // Summary Metrics
  const totalDiscovered = files.length;
  const successful = results.filter((r) => r.status === 'SUCCESS').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;
  const duplicates = results.filter((r) => r.status === 'DUPLICATE').length;

  // Metadata Quality Aggregates
  const titleCount = results.filter((r) => r.title).length;
  const descCount = results.filter((r) => r.hasDescription).length;
  const indCount = results.filter((r) => r.hasIndustry).length;
  const techCountTotal = results.filter((r) => r.techCount > 0).length;
  const serviceCountTotal = results.filter((r) => r.serviceCount > 0).length;
  const tagCountTotal = results.filter((r) => r.tagCount > 0).length;
  const clientCount = results.filter((r) => r.hasClient).length;
  const challengeCount = results.filter((r) => r.hasChallenge).length;
  const solutionCount = results.filter((r) => r.hasSolution).length;
  const resultsCountTotal = results.filter((r) => r.resultCount > 0).length;

  console.log('--- RECONCILIATION SUMMARY ---');
  console.log(`Total Discovered: ${totalDiscovered}`);
  console.log(`Successfully Processed: ${successful}`);
  console.log(`Duplicates Handled: ${duplicates}`);
  console.log(`Failed Files: ${failed}`);
  console.log(`Drafts Created: ${successful}`);
  console.log(`Published Records: 0 (STRICT ENFORCEMENT)`);

  console.log('\n--- METADATA QUALITY METRICS ---');
  console.log(`Title Produced: ${titleCount}/${totalDiscovered}`);
  console.log(`Description Produced: ${descCount}/${totalDiscovered}`);
  console.log(`Industry Produced: ${indCount}/${totalDiscovered}`);
  console.log(`Technologies Extracted: ${techCountTotal}/${totalDiscovered}`);
  console.log(`Services Extracted: ${serviceCountTotal}/${totalDiscovered}`);
  console.log(`Tags Extracted: ${tagCountTotal}/${totalDiscovered}`);
  console.log(`Client Name Extracted: ${clientCount}/${totalDiscovered}`);
  console.log(`Challenge Extracted: ${challengeCount}/${totalDiscovered}`);
  console.log(`Solution Extracted: ${solutionCount}/${totalDiscovered}`);
  console.log(`Key Results Extracted: ${resultsCountTotal}/${totalDiscovered}`);

  // Write full JSON report artifact for verification
  const reportPath = path.join(__dirname, 'phase2_import_results.json');
  fs.writeFileSync(reportPath, JSON.stringify({ results, summary: { totalDiscovered, successful, duplicates, failed } }, null, 2));
  console.log(`\nDetailed JSON results saved to: ${reportPath}`);
}

runBulkImport().catch((err) => {
  console.error('Fatal error during bulk import run:', err);
  process.exit(1);
});
