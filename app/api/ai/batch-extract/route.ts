import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { CaseStudyModel } from '@/lib/models/CaseStudy';
import { extractMetadataFromText } from '@/lib/ai/metadata-extractor';
import { extractTextFromPdfBuffer } from '@/lib/pdf/text-extractor';
import { mockDbStore } from '@/app/api/case-studies/route';
import fs from 'fs';
import path from 'path';

const LOCAL_SOURCE_DIR = 'D:\\Downloads\\new-case-study';

export async function POST(request: NextRequest) {
  try {
    const { caseStudyId, forceReextract = false, limit = 61 } = await request.json();

    let dbConnected = true;
    try {
      await connectToDatabase();
    } catch {
      dbConnected = false;
    }

    let recordsToProcess: any[] = [];

    if (caseStudyId) {
      if (dbConnected) {
        const item = await CaseStudyModel.findById(caseStudyId);
        if (item) recordsToProcess.push(item.toObject());
      } else {
        const item = mockDbStore.get(caseStudyId);
        if (item) recordsToProcess.push(item);
      }
    } else {
      if (dbConnected) {
        const docs = await CaseStudyModel.find({}).limit(limit);
        recordsToProcess = docs.map((d) => d.toObject());
      } else {
        recordsToProcess = Array.from(mockDbStore.values()).slice(0, limit);
      }
    }

    let completed = 0;
    let failed = 0;
    let skipped = 0;
    const results: any[] = [];

    for (const cs of recordsToProcess) {
      const id = cs.id || cs._id?.toString();
      const hasMetadata = Array.isArray(cs.technologies) && cs.technologies.length > 0 && cs.technologies[0] !== 'None specified';

      if (hasMetadata && !forceReextract && !caseStudyId) {
        skipped++;
        results.push({ id, slug: cs.slug, status: 'skipped' });
        continue;
      }

      // Locate PDF file locally or extract
      const fileName = cs.pdf_file_name || `${cs.title}.pdf`;
      let pdfText = '';

      if (fs.existsSync(LOCAL_SOURCE_DIR)) {
        const files = fs.readdirSync(LOCAL_SOURCE_DIR);
        const matched = files.find((f) => f.toLowerCase() === fileName.toLowerCase()) || files.find((f) => f.toLowerCase().includes(cs.slug.toLowerCase()));
        if (matched) {
          const filePath = path.join(LOCAL_SOURCE_DIR, matched);
          const pdfBuffer = fs.readFileSync(filePath);
          const extraction = await extractTextFromPdfBuffer(pdfBuffer);
          pdfText = extraction.text;
        }
      }

      if (!pdfText) {
        pdfText = `${cs.title}\n${cs.description || ''}\n${cs.challenge || ''}\n${cs.solution || ''}`;
      }

      try {
        const extracted = await extractMetadataFromText(pdfText, fileName);

        const updatePayload: Record<string, any> = {
          industry: extracted.industry || cs.industry || 'Information Technology',
          sub_industry: extracted.subIndustry || cs.sub_industry || null,
          technologies: extracted.technologies.length > 0 ? extracted.technologies : cs.technologies,
          services: extracted.services.length > 0 ? extracted.services : cs.services,
          tags: extracted.tags.length > 0 ? extracted.tags : cs.tags,
          project_type: extracted.projectType || cs.project_type || 'Enterprise Software',
          client_name: extracted.client || cs.client_name || null,
          geography: extracted.geography || cs.geography || null,
          challenge: extracted.challenge || cs.challenge || null,
          solution: extracted.solution || cs.solution || null,
          key_results: extracted.keyResults.length > 0 ? extracted.keyResults : cs.key_results,
          business_outcomes: (extracted.businessOutcomes && extracted.businessOutcomes.length > 0) ? extracted.businessOutcomes : cs.business_outcomes || [],

          extraction_status: extracted.extraction_status || 'completed',
          updated_at: new Date().toISOString(),
        };

        if (dbConnected) {
          await CaseStudyModel.findByIdAndUpdate(id, updatePayload);
        }
        if (mockDbStore.has(id)) {
          mockDbStore.set(id, { ...mockDbStore.get(id), ...updatePayload });
        }

        completed++;
        results.push({ id, slug: cs.slug, status: 'completed', metadata: extracted });
      } catch (err: any) {
        failed++;
        results.push({ id, slug: cs.slug, status: 'failed', error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: recordsToProcess.length,
        completed,
        failed,
        skipped,
      },
      results,
    });
  } catch (err: any) {
    console.error('[API /api/ai/batch-extract] Error:', err);
    return NextResponse.json({ error: err.message || 'Batch extraction failed.' }, { status: 500 });
  }
}
