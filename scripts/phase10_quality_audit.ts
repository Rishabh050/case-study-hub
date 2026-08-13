import fs from 'fs';
import path from 'path';

async function runQualityAudit() {
  console.log('=== Executing READ-ONLY Metadata Quality Audit for All 61 Case Studies ===\n');

  const recordsPath = path.join(__dirname, 'all_61_published_records.json');
  const recordsRaw = fs.readFileSync(recordsPath, 'utf8');
  const records = JSON.parse(recordsRaw);

  let highConfidence = 0;
  let needsReview = 0;
  let likelyIncorrect = 0;
  let genericFallbackCount = 0;

  const auditFlags: any[] = [];
  const reviewPriorityList: any[] = [];

  records.forEach((record: any, idx: number) => {
    const title = record.title || `Case Study #${idx + 1}`;
    const flags: string[] = [];

    // Check generic outcomes
    if (Array.isArray(record.business_outcomes)) {
      record.business_outcomes.forEach((b: string) => {
        if (b.includes('Improved operational efficiency and scalability')) {
          genericFallbackCount++;
          flags.push('Generic fallback business outcome string detected');
        }
      });
    }

    // Check portfolio multi-domain industry
    if (
      title.toLowerCase().includes('portfolio') ||
      title.toLowerCase().includes('projects')
    ) {
      if (record.industry && record.industry.includes('Financial Services')) {
        flags.push(`Portfolio document assigned single specific industry: "${record.industry}"`);
      }
    }

    if (flags.length === 0) {
      highConfidence++;
    } else if (flags.length === 1) {
      needsReview++;
      reviewPriorityList.push({ title, flags, record });
    } else {
      likelyIncorrect++;
      reviewPriorityList.push({ title, flags, record });
    }
  });

  console.log('==================================================');
  console.log(`TOTAL CASE STUDIES: ${records.length}`);
  console.log(`HIGH CONFIDENCE: ${highConfidence}`);
  console.log(`NEEDS REVIEW: ${needsReview}`);
  console.log(`LIKELY INCORRECT: ${likelyIncorrect}`);
  console.log(`GENERIC FALLBACK BUSINESS OUTCOMES: ${genericFallbackCount}`);
  console.log('==================================================\n');
}

runQualityAudit();
