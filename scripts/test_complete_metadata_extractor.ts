import fs from 'fs';
import path from 'path';
import { extractTextFromPDF } from '../lib/pdf/extractor';
import { extractHeuristicMetadata } from '../lib/ai/metadata-extractor';

const TEST_FILES = [
  'DevOps.pdf',
  'AI-Assisted Design Validation & Autonomous Testing Workflows.pdf',
  'AI-Powered Customer Calling & Review Management System.pdf',
  'Wahada_Bank.pdf',
  'Web-Based Comprehensive Hospital Management Software.pdf',
  'Web-Based Performance Testing Application for Car Wash Company.pdf',
  'Amcor’s Global Packaging Case-Study.pdf',
];

const TEST_DIR = 'D:\\Downloads\\new-case-study';

async function testCompleteExtractor() {
  console.log('==================================================');
  console.log('=== TESTING COMPLETE METADATA EXTRACTOR REFINEMENT ===');
  console.log('==================================================\n');

  for (const fileName of TEST_FILES) {
    const filePath = path.join(TEST_DIR, fileName);
    if (!fs.existsSync(filePath)) continue;

    const buffer = fs.readFileSync(filePath);
    const pdfExtraction = await extractTextFromPDF(buffer, fileName);

    const metadata = extractHeuristicMetadata(pdfExtraction.text, fileName);

    console.log(`--------------------------------------------------`);
    console.log(`FILE: ${fileName}`);
    console.log(`TITLE:        "${metadata.title}"`);
    console.log(`CLIENT:       "${metadata.client}"`);
    console.log(`INDUSTRY:     "${metadata.industry}"`);
    console.log(`SUB-INDUSTRY: "${metadata.subIndustry}"`);
    console.log(`PROJECT TYPE: "${metadata.projectType}"`);
    console.log(`GEOGRAPHY:    "${metadata.geography}"`);
    console.log(`DESCRIPTION:  "${metadata.description}"`);
    console.log(`TECHNOLOGIES:`, metadata.technologies);
    console.log(`SERVICES:    `, metadata.services);
    console.log(`KEY RESULTS: `, metadata.keyResults);
  }
}

testCompleteExtractor().catch(console.error);
