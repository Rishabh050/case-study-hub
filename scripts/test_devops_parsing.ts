import fs from 'fs';
import path from 'path';
import { extractTextFromPDF } from '../lib/pdf/extractor';
import { extractHeuristicMetadata } from '../lib/ai/metadata-extractor';

async function testSectionAwareParsing() {
  const dir = 'D:\\Downloads\\new-case-study';
  const files = [
    'DevOps.pdf',
    'AI Project Manager Agent.pdf',
    'AI-Assisted Design Validation & Autonomous Testing Workflows.pdf',
    'AI-Powered Customer Calling & Review Management System.pdf',
  ];

  console.log('=== Testing Section-Aware Metadata Parsing ===\n');

  for (const file of files) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) continue;

    const buffer = fs.readFileSync(filePath);
    const pdfRes = await extractTextFromPDF(buffer);
    const meta = extractHeuristicMetadata(pdfRes.text, file);

    console.log(`==================================================`);
    console.log(`FILE: ${file}`);
    console.log(`Title: "${meta.title}"`);
    console.log(`Client: "${meta.client}"`);
    console.log(`Industry: "${meta.industry}"`);
    console.log(`Sub-Industry: "${meta.subIndustry}"`);
    console.log(`Project Type: "${meta.projectType}"`);
    console.log(`Technologies (${meta.technologies.length}):`, meta.technologies);
    console.log(`Services (${meta.services.length}):`, meta.services);
    console.log(`Key Results (${meta.keyResults.length}):`, meta.keyResults);
    console.log(`Business Outcomes (${meta.businessOutcomes.length}):`, meta.businessOutcomes);
    console.log(`==================================================\n`);
  }
}

testSectionAwareParsing();
