const fs = require('fs');
const path = require('path');
const { extractTextFromPDF } = require('../lib/pdf/extractor');

const SOURCE_DIR = 'D:\\Downloads\\new-case-study';

interface EnrichmentPreview {
  index: number;
  filename: string;
  title: string;
  description: string | null;
  industry: string | null;
  clientName: string | null;
  clientCategory: 'EXPLICIT_CLIENT' | 'REFERENCE_COMPANY' | 'UNKNOWN';
  technologies: string[];
  services: string[];
  challenge: string | null;
  solution: string | null;
  keyResults: { metric?: string; value?: string; statement: string }[];
  tags: string[];
  confidenceRating: 'High' | 'Medium' | 'Low';
  manualReviewFields: string[];
  notes: string;
}

const techCatalog = [
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'GitLab CI',
  'React', 'Next.js', 'Node.js', 'Python', 'TypeScript', 'PostgreSQL', 'MongoDB',
  'Redis', 'Kafka', 'Odoo', 'LiveKit', 'GraphQL', 'REST API', 'Power Apps', 'Power Automate',
  'Flutter', 'React Native', 'Swift', 'Kotlin', 'Java', 'Spring Boot', 'Microservices',
  'Snowflake', 'Databricks', 'TensorFlow', 'PyTorch', 'Elasticsearch'
];

const serviceCatalog = [
  'Cloud Native DevOps Transformation', 'Custom ERP Implementation', 'Mobile App Development',
  'Telemedicine Platform Development', 'AI & Machine Learning Engineering', 'Blockchain & Smart Contracts',
  'UI/UX Modernization', 'API & Microservices Integration', 'Enterprise Automation (RPA)',
  'Data Engineering & Analytics', 'Quality Management System Development'
];

async function runEnrichmentPreview() {
  console.log('=== Starting Phase 4A: Metadata Enrichment Preview (READ-ONLY) ===\n');

  const files = fs
    .readdirSync(SOURCE_DIR)
    .filter((f: string) => f.toLowerCase().endsWith('.pdf'))
    .sort();

  console.log(`Discovered ${files.length} PDF files for enrichment analysis.\n`);

  const previews: EnrichmentPreview[] = [];

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filePath = path.join(SOURCE_DIR, filename);
    const buffer = fs.readFileSync(filePath);

    const extraction = await extractTextFromPDF(buffer);
    const rawText = extraction.text || '';
    const lines = rawText.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const lowerText = rawText.toLowerCase();

    const manualReviewFields: string[] = [];

    // 1. Title
    let title = lines[0] || filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
    title = title.replace(/\s+/g, ' ').trim();
    if (title.length < 5) title = filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');

    // 2. Executive Summary / Description
    let description: string | null = null;
    const summaryMatch = rawText.match(/(?:Executive Summary|Overview|Introduction|Abstract)[:\s]+([\s\S]{40,300}?)(?=\n\n|\n[A-Z]|$)/i);
    if (summaryMatch) {
      description = summaryMatch[1].replace(/\s+/g, ' ').trim();
    } else if (lines.length > 2) {
      description = lines.slice(1, 3).join(' ').replace(/\s+/g, ' ').trim().substring(0, 250);
    }
    if (!description || description.length < 30) {
      description = null;
      manualReviewFields.push('description');
    }

    // 3. Industry Detection (Strict Evidence Rule)
    let industry: string | null = null;
    if (lowerText.includes('fintech') || lowerText.includes('banking') || lowerText.includes('aml') || lowerText.includes('sme-banking')) {
      industry = 'Financial Services & Banking';
    } else if (lowerText.includes('healthcare') || lowerText.includes('telemedicine') || lowerText.includes('hospital') || lowerText.includes('biotech')) {
      industry = 'Healthcare & Life Sciences';
    } else if (lowerText.includes('packaging') || lowerText.includes('manufacturing') || lowerText.includes('amcor') || lowerText.includes('seafood')) {
      industry = 'Manufacturing & Packaging';
    } else if (lowerText.includes('real estate') || lowerText.includes('construction') || lowerText.includes('property')) {
      industry = 'Real Estate & Construction';
    } else if (lowerText.includes('devops') || lowerText.includes('cloud') || lowerText.includes('software') || lowerText.includes('semiconductor')) {
      industry = 'Software & Technology';
    } else if (lowerText.includes('car wash') || lowerText.includes('automotive') || lowerText.includes('car marketplace')) {
      industry = 'Automotive & Mobility';
    } else if (lowerText.includes('fitness') || lowerText.includes('nutrition') || lowerText.includes('dating') || lowerText.includes('salon')) {
      industry = 'Consumer Apps & Lifestyle';
    } else if (lowerText.includes('travel') || lowerText.includes('rail') || lowerText.includes('fleet')) {
      industry = 'Transportation & Logistics';
    } else {
      manualReviewFields.push('industry');
    }

    // 4. Client Name & Category Analysis
    let clientName: string | null = null;
    let clientCategory: EnrichmentPreview['clientCategory'] = 'UNKNOWN';

    const clientMatch = rawText.match(/(?:Client|Customer|Organization|Partner)[:\s]+([A-Z0-9\s&,.-]{3,40})/i);
    if (clientMatch) {
      const candidate = clientMatch[1].trim();
      if (candidate && !['testimonial', 'revenues', 'years', 'ninjas'].includes(candidate.toLowerCase())) {
        clientName = candidate;
        clientCategory = 'EXPLICIT_CLIENT';
      }
    }

    if (!clientName) {
      // Check for prominent company names in title / header
      if (filename.includes('Amcor')) clientName = 'Amcor';
      else if (filename.includes('Sam and G Man')) clientName = 'Sam and G Man';
      else if (filename.includes('DBSA')) clientName = 'Development Bank of Southern Africa';
      else if (filename.includes('Maal Bank')) clientName = 'Maal Bank';
      else if (filename.includes('Wahada')) clientName = 'Wahada Bank';
      else if (filename.includes('liugong')) clientName = 'LiuGong India';

      if (clientName) {
        clientCategory = 'REFERENCE_COMPANY';
      } else {
        manualReviewFields.push('client_name');
      }
    }

    // 5. Technologies
    const technologies = techCatalog.filter((tech) =>
      new RegExp(`\\b${tech.replace('.', '\\.')}\\b`, 'i').test(rawText)
    );
    if (technologies.length === 0) manualReviewFields.push('technologies');

    // 6. Services
    const services = serviceCatalog.filter((service) =>
      new RegExp(`\\b${service.replace('(', '\\(').replace(')', '\\)')}\\b`, 'i').test(rawText)
    );
    if (services.length === 0) manualReviewFields.push('services');

    // 7. Challenge & 8. Solution
    let challenge: string | null = null;
    let solution: string | null = null;

    const chMatch = rawText.match(/(?:Challenge|Problem|Background|The Need)[:\s]+([\s\S]{40,350}?)(?=\n\n|\n[A-Z]|Solution|Results|$)/i);
    if (chMatch) challenge = chMatch[1].replace(/\s+/g, ' ').trim();

    const solMatch = rawText.match(/(?:Solution|Approach|What We Built|Architecture)[:\s]+([\s\S]{40,400}?)(?=\n\n|\n[A-Z]|Results|Outcomes|$)/i);
    if (solMatch) solution = solMatch[1].replace(/\s+/g, ' ').trim();

    // Special Case: case-study-gate.pdf (PARTIAL)
    if (filename.includes('gate') && !solution) {
      manualReviewFields.push('solution');
    }
    if (!challenge) manualReviewFields.push('challenge');
    if (!solution) manualReviewFields.push('solution');

    // 9. Key Results & Metrics
    const metricRegex = /([+|-]?\d+(?:\.\d+)?%|\$\d+(?:\.\d+)?[kMBN]?|\d+\s*(?:sec|seconds|ms|hrs|hours|days|x|fold))\s+([a-zA-Z0-9\s,.-]{4,50})/gi;
    const keyResults: { value: string; statement: string }[] = [];
    let match;
    while ((match = metricRegex.exec(rawText)) !== null && keyResults.length < 6) {
      const val = match[1];
      const stmt = `${match[1]} ${match[2].trim()}`;
      if (!keyResults.some((k) => k.statement === stmt)) {
        keyResults.push({ value: val, statement: stmt });
      }
    }
    if (keyResults.length === 0) manualReviewFields.push('key_results');

    // 10. Tags
    const tags = [industry, ...technologies.slice(0, 3), ...services.slice(0, 2)].filter(Boolean) as string[];

    // 11. Confidence Rating
    let confidenceRating: EnrichmentPreview['confidenceRating'] = 'High';
    if (manualReviewFields.length >= 4 || filename.includes('gate')) {
      confidenceRating = 'Low';
    } else if (manualReviewFields.length >= 2 || !industry || !clientName) {
      confidenceRating = 'Medium';
    }

    previews.push({
      index: i + 1,
      filename,
      title,
      description,
      industry,
      clientName,
      clientCategory,
      technologies,
      services,
      challenge,
      solution,
      keyResults,
      tags,
      confidenceRating,
      manualReviewFields,
      notes: manualReviewFields.length > 0 ? `Requires admin review for: ${manualReviewFields.join(', ')}` : 'Strong source-supported metadata',
    });
  }

  // Summary Metrics
  const totalRecords = previews.length;
  const highConfidence = previews.filter((p) => p.confidenceRating === 'High').length;
  const mediumConfidence = previews.filter((p) => p.confidenceRating === 'Medium').length;
  const lowConfidence = previews.filter((p) => p.confidenceRating === 'Low').length;
  const manualReviewRequired = previews.filter((p) => p.manualReviewFields.length > 0).length;

  const summary = {
    totalRecords,
    highConfidence,
    mediumConfidence,
    lowConfidence,
    manualReviewRequired,
  };

  console.log('=== PHASE 4A METADATA PREVIEW SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));

  // Save report artifact
  const outPath = path.join(__dirname, 'phase4a_enrichment_preview.json');
  fs.writeFileSync(outPath, JSON.stringify({ summary, previews }, null, 2));
  console.log(`\nSaved Phase 4A preview report JSON to: ${outPath}`);
}

runEnrichmentPreview().catch((err) => {
  console.error('Fatal error during Phase 4A enrichment preview:', err);
  process.exit(1);
});
