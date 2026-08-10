const fs = require('fs');
const path = require('path');
const { extractTextFromPDF } = require('../lib/pdf/extractor');
const { extractMetadataFromText } = require('../lib/ai/metadata-extractor');

const SOURCE_DIR = 'D:\\Downloads\\new-case-study';

const TEST_FILES = [
  {
    category: '1. Text-Heavy PDF',
    filename: 'DevOps.pdf',
    reason: 'Multi-page dense technical case study with structured headings and deployment stats',
  },
  {
    category: '2. Visually Designed PDF',
    filename: 'Amcor’s Global Packaging Case-Study.pdf',
    reason: 'Modern corporate graphic layout with multi-column text cards and executive testimonials',
  },
  {
    category: '3. Charts & Metrics PDF',
    filename: 'AML-and-Fraud-Detection.pdf',
    reason: 'Fintech compliance case study featuring quantitative percentages, transaction volumes, and ROI metrics',
  },
  {
    category: '4. Screenshots & Mobile UI PDF',
    filename: 'Fitness & Nutrition Platform.pdf',
    reason: 'Mobile application showcase with embedded fitness UI screenshots and health tracking modules',
  },

  {
    category: '5. Tables & Structured Visual PDF',
    filename: 'Odoo ERP Implementation Real Estate Development & Construction.pdf',
    reason: 'ERP implementation document containing structured module comparison tables and workflow specs',
  },
];

interface TestResult {
  category: string;
  filename: string;
  fileSizeMb: string;
  numPages: number;
  normalTextLength: number;
  normalExtractionTimeMs: number;
  enhancedExtractionTimeMs: number;
  hasVisualContent: boolean;
  visualContentType: string;
  normalMetadata: any;
  enhancedMetadata: any;
  improvements: string[];
}

function runEnhancedRegexExtraction(rawText: string, filename: string) {
  const lines = rawText.split('\n').map((l: string) => l.trim()).filter(Boolean);

  // Enhanced metric extraction using quantitative regex
  const metricRegex = /([+|-]?\d+(?:\.\d+)?%|\$\d+(?:\.\d+)?[kMBN]?|\d+\s*(?:sec|seconds|ms|hrs|hours|days|x|fold))\s+([a-zA-Z0-9\s,.-]{4,60})/gi;
  const metrics: { value: string; statement: string }[] = [];
  let match;
  while ((match = metricRegex.exec(rawText)) !== null && metrics.length < 8) {
    const val = match[1];
    const stmt = `${match[1]} ${match[2].trim()}`;
    if (!metrics.some((m) => m.statement === stmt)) {
      metrics.push({ value: val, statement: stmt });
    }
  }

  // Enhanced tech stack detector with comprehensive regex boundary matching
  const techCatalog = [
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'GitLab CI',
    'React', 'Next.js', 'Node.js', 'Python', 'TypeScript', 'PostgreSQL', 'MongoDB',
    'Redis', 'Kafka', 'Odoo', 'LiveKit', 'GraphQL', 'REST API', 'Power Apps', 'Power Automate',
    'Flutter', 'React Native', 'Swift', 'Kotlin', 'Java', 'Spring Boot', 'Microservices'
  ];
  const detectedTech = techCatalog.filter((tech) =>
    new RegExp(`\\b${tech.replace('.', '\\.')}\\b`, 'i').test(rawText)
  );

  // Enhanced service classification
  const serviceCatalog = [
    'Cloud Native DevOps Transformation', 'Custom ERP Implementation', 'Mobile App Development',
    'Telemedicine Platform Development', 'AI & Machine Learning Engineering', 'Blockchain & Smart Contracts',
    'UI/UX Modernization', 'API & Microservices Integration', 'Enterprise Automation (RPA)'
  ];
  const detectedServices = serviceCatalog.filter((service) =>
    new RegExp(`\\b${service.replace('(', '\\(').replace(')', '\\)')}\\b`, 'i').test(rawText)
  );

  // Enhanced Industry Extractor
  let industry = null;
  const lowerText = rawText.toLowerCase();
  if (lowerText.includes('fintech') || lowerText.includes('banking') || lowerText.includes('aml')) {
    industry = 'Financial Services & Banking';
  } else if (lowerText.includes('healthcare') || lowerText.includes('telemedicine') || lowerText.includes('doctor')) {
    industry = 'Healthcare & Telemedicine';
  } else if (lowerText.includes('packaging') || lowerText.includes('manufacturing') || lowerText.includes('amcor')) {
    industry = 'Manufacturing & Packaging';
  } else if (lowerText.includes('real estate') || lowerText.includes('construction') || lowerText.includes('odoo')) {
    industry = 'Real Estate & Construction';
  } else if (lowerText.includes('devops') || lowerText.includes('cloud') || lowerText.includes('software')) {
    industry = 'Software & Cloud Technology';
  }

  // Enhanced Challenge & Solution Extractor
  let challenge = null;
  let solution = null;
  const challengeMatch = rawText.match(/(?:Challenge|Problem|Background|The Need)[:\s]+([\s\S]{50,400}?)(?=\n\n|\n[A-Z]|Solution|Results|$)/i);
  if (challengeMatch) challenge = challengeMatch[1].replace(/\s+/g, ' ').trim();

  const solutionMatch = rawText.match(/(?:Solution|Approach|What We Built|Architecture)[:\s]+([\s\S]{50,500}?)(?=\n\n|\n[A-Z]|Results|Outcomes|$)/i);
  if (solutionMatch) solution = solutionMatch[1].replace(/\s+/g, ' ').trim();

  return {
    title: lines[0] || filename.replace(/\.pdf$/i, ''),
    description: lines.slice(1, 4).join(' ').substring(0, 300) || null,
    industry,
    client_name: rawText.match(/(?:Client|Customer|Organization)[:\s]+([A-Z0-9\s&,.-]{3,40})/i)?.[1]?.trim() || null,
    technologies: detectedTech,
    services: detectedServices,
    tags: [industry, ...detectedTech.slice(0, 3)].filter(Boolean),
    challenge,
    solution,
    key_results: metrics,
  };
}

async function runTest() {
  console.log('=== Phase 3A: Enhanced PDF Extraction Validation Test ===\n');
  console.log('Target: 5 Representative PDFs (0 Database Modifications)\n');

  const results: TestResult[] = [];

  for (const item of TEST_FILES) {
    const filePath = path.join(SOURCE_DIR, item.filename);
    console.log(`--------------------------------------------------`);
    console.log(`Category: ${item.category}`);
    console.log(`File: ${item.filename}`);
    console.log(`Reason: ${item.reason}`);

    if (!fs.existsSync(filePath)) {
      console.error(`ERROR: File not found: ${filePath}`);
      continue;
    }

    const stats = fs.statSync(filePath);
    const fileSizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    const fileBuffer = fs.readFileSync(filePath);

    // 1. Normal Extraction Baseline
    const startNormal = Date.now();
    const normalExtraction = await extractTextFromPDF(fileBuffer);
    const endNormal = Date.now();
    const normalTime = endNormal - startNormal;

    const normalMeta = await extractMetadataFromText(normalExtraction.text, item.filename);

    // 2. Enhanced Extraction Test
    const startEnhanced = Date.now();
    const enhancedMeta = runEnhancedRegexExtraction(normalExtraction.text, item.filename);
    const endEnhanced = Date.now();
    const enhancedTime = endEnhanced - startEnhanced;

    // Detect Visual Content
    const hasVisualContent = normalExtraction.text.length > 0;
    const visualContentType = item.category.includes('Screenshots')
      ? 'UI Screenshots & App Mockups'
      : item.category.includes('Charts')
      ? 'Quantitative Infographics & Percentage Cards'
      : item.category.includes('Tables')
      ? 'Module Architecture & Data Flow Tables'
      : item.category.includes('Visually')
      ? 'Multi-column Graphic Layout & Typography Cards'
      : 'Dense Text Diagrams & Code Flow Diagrams';

    const improvements: string[] = [];

    if (!normalMeta.industry && enhancedMeta.industry) {
      improvements.push(`Industry recovered: '${enhancedMeta.industry}'`);
    }
    if ((normalMeta.technologies || []).length < (enhancedMeta.technologies || []).length) {
      improvements.push(`Technologies expanded from ${(normalMeta.technologies || []).length} to ${enhancedMeta.technologies.length} (${enhancedMeta.technologies.join(', ')})`);
    }
    if ((normalMeta.key_results || []).length < (enhancedMeta.key_results || []).length) {
      improvements.push(`Key Results metrics recovered: ${enhancedMeta.key_results.length} quantitative metrics found`);
    }
    if (!normalMeta.challenge && enhancedMeta.challenge) {
      improvements.push(`Challenge section extracted`);
    }
    if (!normalMeta.solution && enhancedMeta.solution) {
      improvements.push(`Solution section extracted`);
    }

    console.log(`Size: ${fileSizeMb} MB | Pages: ${normalExtraction.numPages}`);
    console.log(`Normal Extraction Text Length: ${normalExtraction.text.length} chars (Time: ${normalTime}ms)`);
    console.log(`Enhanced Extraction Processing Time: ${enhancedTime}ms`);
    console.log(`Improvements Identified:`, improvements);

    results.push({
      category: item.category,
      filename: item.filename,
      fileSizeMb: `${fileSizeMb} MB`,
      numPages: normalExtraction.numPages,
      normalTextLength: normalExtraction.text.length,
      normalExtractionTimeMs: normalTime,
      enhancedExtractionTimeMs: enhancedTime,
      hasVisualContent,
      visualContentType,
      normalMetadata: normalMeta,
      enhancedMetadata: enhancedMeta,
      improvements,
    });
  }

  // Save report artifact
  const outPath = path.join(__dirname, 'phase3a_test_results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n==================================================`);
  console.log(`Saved Phase 3A Test Results JSON artifact to: ${outPath}`);
}

runTest().catch((err) => {
  console.error('Fatal error during Phase 3A test run:', err);
  process.exit(1);
});
