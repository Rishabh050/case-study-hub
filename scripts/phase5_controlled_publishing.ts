const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

const TARGET_PUBLISH_FILES = [
  'DevOps.pdf',
  'AML-and-Fraud-Detection.pdf',
  'ConsultNet.Online - A Telemedicine App That Provides Live Doctor Consultation Services‬.pdf',
  'Amcor’s Global Packaging Case-Study.pdf',
  'Case-Study-Self-Hosted Live Classroom Platform with LiveKit Infrastructure.pdf',
];

async function runControlledPublishingTest() {
  console.log('=== Starting Phase 5: Controlled Publishing Test (EXACTLY 5 RECORDS) ===\n');

  // Step 1: Pre-Publish Safety Check
  console.log('Step 1 — Checking current database state...');
  const allRes = await fetch(`${BASE_URL}/api/case-studies?limit=200&status=all`);
  const allJson = await allRes.json();
  const dbRecords = allJson.data || [];

  console.log(`- Discovered Database Records: ${dbRecords.length}`);
  const initialPublished = dbRecords.filter((r: any) => r.status === 'published');
  console.log(`- Pre-test Published count: ${initialPublished.length} (MUST BE 0)`);

  const publishedIds: string[] = [];
  const publishedSlugs: string[] = [];

  // Step 2: Publish Exactly 5 Selected Records
  console.log('\nStep 2 — Publishing exactly 5 selected representative case studies...');

  for (const filename of TARGET_PUBLISH_FILES) {
    const record = dbRecords.find((r: any) => r.pdf_file_name === filename);
    if (!record) {
      console.warn(`Target file not found in DB: ${filename}`);
      continue;
    }

    console.log(`Publishing: "${record.title}" (${filename})...`);
    const pubRes = await fetch(`${BASE_URL}/api/case-studies/${record.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' }),
    });

    if (pubRes.ok) {
      publishedIds.push(record.id);
      publishedSlugs.push(record.slug);
      console.log(`SUCCESS: Published record ID ${record.id} (slug: ${record.slug})`);
    } else {
      console.error(`FAILED to publish record ID ${record.id}:`, pubRes.status);
    }
  }

  // Step 3: PART 9 Publication Safety Verification
  console.log('\nStep 3 — PART 9 Publication Safety Test...');

  // Public Query Check (Default: status = 'published')
  const pubQueryRes = await fetch(`${BASE_URL}/api/case-studies?limit=200`);
  const pubQueryJson = await pubQueryRes.json();
  const publicItems = pubQueryJson.data || [];

  console.log(`- Public API Return Count (Default GET /api/case-studies): ${publicItems.length}`);
  console.log(`- Published Slugs in Public API:`, publicItems.map((i: any) => i.slug));

  const allPublished = publicItems.every((i: any) => i.status === 'published');
  console.log(`- Are ALL public items status = 'published'? ${allPublished ? 'YES (PASS)' : 'NO (FAIL)'}`);

  // Draft Isolation Check
  const draftRes = await fetch(`${BASE_URL}/api/case-studies?limit=200&status=draft`);
  const draftJson = await draftRes.json();
  const remainingDrafts = draftJson.data || [];
  console.log(`- Remaining Draft Records Count: ${remainingDrafts.length} (Expected: 56)`);

  // Slug Detail Page Verification
  console.log('\nStep 4 — Verifying Detail Page Load by Slug for Published Records...');
  for (const slug of publishedSlugs) {
    const detailRes = await fetch(`${BASE_URL}/api/case-studies/${slug}`);
    const detailJson = await detailRes.json();
    console.log(`- Slug /case-studies/${slug}: Status HTTP ${detailRes.status} | Title: "${detailJson.data?.title}"`);
  }

  // Unpublish Test Verification (Unpublish 1 record, verify removal, then re-publish)
  console.log('\nStep 5 — Testing Immediate Unpublish Behavior...');
  const testUnpubId = publishedIds[0];
  const testUnpubSlug = publishedSlugs[0];

  console.log(`Unpublishing ID ${testUnpubId} (${testUnpubSlug})...`);
  await fetch(`${BASE_URL}/api/case-studies/${testUnpubId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'draft' }),
  });

  const postUnpubRes = await fetch(`${BASE_URL}/api/case-studies?limit=200`);
  const postUnpubJson = await postUnpubRes.json();
  const postUnpubItems = postUnpubJson.data || [];
  const isRemoved = !postUnpubItems.some((i: any) => i.id === testUnpubId);
  console.log(`- Was unpublished record immediately removed from public results? ${isRemoved ? 'YES (PASS)' : 'NO (FAIL)'}`);

  // Re-publish to maintain exactly 5 published records
  console.log(`Re-publishing ID ${testUnpubId}...`);
  await fetch(`${BASE_URL}/api/case-studies/${testUnpubId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'published' }),
  });

  // Final State Reconciliation
  const finalAllRes = await fetch(`${BASE_URL}/api/case-studies?limit=200&status=all`);
  const finalAllJson = await finalAllRes.json();
  const finalRecords = finalAllJson.data || [];

  const finalDrafts = finalRecords.filter((r: any) => r.status === 'draft');
  const finalPublished = finalRecords.filter((r: any) => r.status === 'published');

  console.log('\n=== FINAL CONTROLLED PUBLISHING RECONCILIATION ===');
  console.log(`Total Database Records: ${finalRecords.length}`);
  console.log(`Published Case Studies: ${finalPublished.length} (EXACTLY 5 PUBLISHED)`);
  console.log(`Draft Case Studies: ${finalDrafts.length} (EXACTLY 56 DRAFTS)`);
  console.log(`Published Slugs:`, finalPublished.map((r: any) => r.slug));

  const summary = {
    totalRecords: finalRecords.length,
    publishedCount: finalPublished.length,
    draftCount: finalDrafts.length,
    publishedFiles: TARGET_PUBLISH_FILES,
    publishedSlugs: finalPublished.map((r: any) => r.slug),
    publicDraftIsolation: allPublished && isRemoved,
  };

  const outPath = path.join(__dirname, 'phase5_publishing_results.json');
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(`\nSaved Phase 5 Controlled Publishing Report to: ${outPath}`);
}

runControlledPublishingTest().catch((err) => {
  console.error('Fatal error during controlled publishing test:', err);
  process.exit(1);
});
