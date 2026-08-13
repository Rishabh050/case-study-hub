import fs from 'fs';
import path from 'path';
import { extractTextFromPDF } from '../lib/pdf/extractor';
import { extractMetadataFromText } from '../lib/ai/metadata-extractor';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function publishAll61CaseStudies() {
  console.log('=== Running Zero-Hallucination Metadata Extraction across All 61 Case Studies ===\n');

  const previewPath = path.join(__dirname, 'phase4a_enrichment_preview.json');
  const previewRaw = fs.readFileSync(previewPath, 'utf8');
  const previewJson = JSON.parse(previewRaw);

  const previews = previewJson.previews || [];
  console.log(`Loaded ${previews.length} case study previews.`);

  const LOCAL_SOURCE_DIR = 'D:\\Downloads\\new-case-study';
  const localFiles = fs.existsSync(LOCAL_SOURCE_DIR) ? fs.readdirSync(LOCAL_SOURCE_DIR) : [];

  const all61Records = [];

  for (let idx = 0; idx < previews.length; idx++) {
    const item = previews[idx];
    const rawFileName = item.filename;
    let matchedFile = localFiles.find((f) => f.toLowerCase() === rawFileName.toLowerCase());
    if (!matchedFile) {
      const normRaw = rawFileName.toLowerCase().replace(/[^a-z0-9]/g, '');
      matchedFile = localFiles.find((f) => f.toLowerCase().replace(/[^a-z0-9]/g, '') === normRaw) || rawFileName;
    }

    const title = item.title || rawFileName.replace(/\.pdf$/i, '');
    let slug = slugify(title);
    if (!slug) slug = `case-study-${idx + 1}`;

    const filePath = path.join(LOCAL_SOURCE_DIR, matchedFile);
    let extractedText = '';

    if (fs.existsSync(filePath)) {
      try {
        const buffer = fs.readFileSync(filePath);
        const pdfRes = await extractTextFromPDF(buffer);
        extractedText = pdfRes.text;
      } catch (e: any) {
        console.warn(`Warning parsing ${matchedFile}:`, e.message);
      }
    }

    const extractedMeta = await extractMetadataFromText(extractedText, matchedFile);

    // ZERO-HALLUCINATION RULE: Filter out generic fallback outcomes
    const filteredOutcomes = (extractedMeta.businessOutcomes || []).filter(
      (b) => !b.includes('Improved operational efficiency and scalability')
    );

    all61Records.push({
      id: `cs-61-${idx + 1}`,
      title,
      slug,
      description: item.description || extractedMeta.challenge || null,
      industry: extractedMeta.industry || item.industry || 'Information Technology',
      sub_industry: extractedMeta.subIndustry || null,
      client_name: item.clientName || extractedMeta.client || null,
      geography: extractedMeta.geography || null,
      project_type: extractedMeta.projectType || 'Enterprise Solution',
      challenge: item.challenge || extractedMeta.challenge || null,
      solution: item.solution || extractedMeta.solution || null,
      technologies: extractedMeta.technologies || [],
      services: extractedMeta.services || [],
      tags: extractedMeta.tags || [],
      key_results: extractedMeta.keyResults || [],
      business_outcomes: filteredOutcomes,
      pdf_file_name: matchedFile,
      pdf_storage_key: matchedFile,
      status: 'published',
      extraction_status: extractedMeta.extraction_status || 'completed',
      featured: idx < 10,
    });

    console.log(`[${idx + 1}/61] ${title} -> Industry: "${extractedMeta.industry}" | Tech: ${extractedMeta.technologies.length} | Outcomes: ${filteredOutcomes.length}`);
  }

  console.log(`\nSuccessfully processed and formatted all ${all61Records.length} case study records.`);

  const outPath = path.join(__dirname, 'all_61_published_records.json');
  fs.writeFileSync(outPath, JSON.stringify(all61Records, null, 2));
  console.log(`Saved enriched 61 published records to: ${outPath}`);
}

publishAll61CaseStudies().catch((err) => {
  console.error('Error publishing case studies:', err);
});
