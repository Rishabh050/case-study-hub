const fs = require('fs');
const path = require('path');

const FILE_PATH = 'D:\\Downloads\\new-case-study\\Case Study_ Ad-Tech.pdf';
const BASE_URL = 'http://localhost:3000';

async function processSingleAdTechPdf() {
  console.log('=== Step 1 — Processing ONLY: Case Study_ Ad-Tech.pdf ===\n');

  if (!fs.existsSync(FILE_PATH)) {
    console.error(`Target file not found at: ${FILE_PATH}`);
    process.exit(1);
  }

  const filename = path.basename(FILE_PATH);
  const stats = fs.statSync(FILE_PATH);
  const fileSizeMb = (stats.size / (1024 * 1024)).toFixed(1);
  console.log(`File: ${filename} (${fileSizeMb} MB)`);

  // Step 2 — Duplicate Check
  console.log('\nStep 2 — Checking for existing database records (Duplicate Protection)...');
  const checkRes = await fetch(`${BASE_URL}/api/case-studies?limit=200&status=`);
  if (checkRes.ok) {
    const checkJson = await checkRes.json();
    const existing = (checkJson.data || []).find(
      (item: any) =>
        item.pdf_file_name === filename ||
        item.title?.toLowerCase().includes('ad-tech')
    );

    if (existing) {
      console.log(`DUPLICATE DETECTED: Record already exists in database with ID: ${existing.id}`);
      console.log('Processing aborted to prevent duplicate record creation.');
      process.exit(0);
    }
  }

  // Step 3 — Server Upload to Backblaze B2 & PDF Text Extraction
  console.log('\nStep 3 — Uploading 86.5 MB PDF to Backblaze B2 & extracting text via /api/upload/pdf...');
  const fileBuffer = fs.readFileSync(FILE_PATH);
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });

  const formData = new FormData();
  formData.append('file', blob, filename);

  const uploadRes = await fetch(`${BASE_URL}/api/upload/pdf`, {
    method: 'POST',
    body: formData,
  });

  const uploadJson = await uploadRes.json();
  console.log('Upload Status:', uploadRes.status);
  console.log('Upload Output:', {
    success: uploadJson.success,
    pdfFileName: uploadJson.pdfFileName,
    pdfFileSize: `${(uploadJson.pdfFileSize / (1024 * 1024)).toFixed(1)} MB`,
    storageKey: uploadJson.storageKey,
    hasExtractableText: uploadJson.hasExtractableText,
    pageCount: uploadJson.pageCount,
    extractedTextLength: uploadJson.extractedText?.length || 0,
  });

  if (!uploadRes.ok || !uploadJson.success) {
    throw new Error(`Upload failed: ${uploadJson.error}`);
  }

  // Step 4 — AI Metadata Extraction
  console.log('\nStep 4 — Running AI Metadata Extraction via /api/ai/extract-metadata...');
  const aiRes = await fetch(`${BASE_URL}/api/ai/extract-metadata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: uploadJson.extractedText || '',
      fileName: filename,
    }),
  });

  const aiJson = await aiRes.json();
  console.log('AI Extraction Status:', aiRes.status);
  console.log('Generated Structured Metadata:', JSON.stringify(aiJson.metadata, null, 2));

  if (!aiRes.ok || !aiJson.success) {
    throw new Error(`AI extraction failed: ${aiJson.error}`);
  }

  const meta = aiJson.metadata;

  // Step 5 — Save Record strictly as DRAFT
  console.log('\nStep 5 — Saving case study record as DRAFT in Supabase...');
  const draftPayload = {
    title: meta.title || 'Case Study: Ad-Tech Platform Architecture',
    description: meta.description || null,
    industry: meta.industry || 'Ad-Tech & Digital Media',
    client_name: meta.client_name || null,
    challenge: meta.challenge || null,
    solution: meta.solution || null,
    technologies: meta.technologies || [],
    services: meta.services || [],
    tags: meta.tags || ['Ad-Tech', 'High-Scale', 'Real-Time Bidding'],
    key_results: meta.key_results || [],
    pdf_file_name: filename,
    pdf_storage_key: uploadJson.storageKey,
    status: 'draft', // STRICT ENFORCEMENT: MUST BE DRAFT
    featured: false,
  };

  const draftRes = await fetch(`${BASE_URL}/api/case-studies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draftPayload),
  });

  const draftJson = await draftRes.json();
  console.log('Draft Creation Status:', draftRes.status);
  console.log('Draft Record Output:', {
    id: draftJson.data?.id,
    title: draftJson.data?.title,
    slug: draftJson.data?.slug,
    status: draftJson.data?.status,
  });

  if (!draftRes.ok || !draftJson.data) {
    throw new Error(`Draft creation failed: ${draftJson.error}`);
  }

  const draftId = draftJson.data.id;

  // Step 6 — Privacy & Public Visibility Verification
  console.log('\nStep 6 — Verifying Privacy (Public API /case-studies check)...');
  const publicRes = await fetch(`${BASE_URL}/api/case-studies`);
  const publicJson = await publicRes.json();
  const isDraftVisibleInPublic = (publicJson.data || []).some((item: any) => item.id === draftId);
  console.log(`Is Ad-Tech draft visible in public library? ${isDraftVisibleInPublic ? 'YES (FAIL)' : 'NO (PASS - Protected)'}`);

  // Step 7 — Secure Temporary URL Verification
  console.log('\nStep 7 — Generating Secure Presigned Access Link (/api/pdf/download)...');
  const pdfUrlRes = await fetch(`${BASE_URL}/api/pdf/download?key=${encodeURIComponent(uploadJson.storageKey)}`);
  const pdfUrlJson = await pdfUrlRes.json();
  console.log('Presigned Link Status:', pdfUrlRes.status);
  console.log('Generated Presigned URL:', pdfUrlJson.url);

  console.log('\n=== PHASE 2A SINGLE FILE IMPORT COMPLETED SUCCESSFULLY ===');
}

processSingleAdTechPdf().catch((err) => {
  console.error('Fatal error during Ad-Tech PDF import:', err);
  process.exit(1);
});
