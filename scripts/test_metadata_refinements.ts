import fs from 'fs';
import path from 'path';
import { extractTextFromPDF } from '../lib/pdf/extractor';
import { isValidTitle } from '../lib/pdf/extractor';

const TEST_FILES = [
  'DevOps.pdf',
  'AI-Assisted Design Validation & Autonomous Testing Workflows.pdf',
  'AI-Powered Customer Calling & Review Management System.pdf',
  'Architecting a Universal AI Agent for Multi-Domain Conversational Commerce.pdf',
  'Amcor’s Global Packaging Case-Study.pdf',
];

const TEST_DIR = 'D:\\Downloads\\new-case-study';

function testRefinedTitle(text: string, pdfFileName: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1. Explicit label "Case Study: <Title>" or "Title: <Title>"
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const l = lines[i];
    if (/^(?:case study|title):?\s*/i.test(l)) {
      let candidate = l.replace(/^(?:case study|title):?\s*/i, '').trim();
      if ((candidate.endsWith('&') || candidate.toLowerCase().endsWith('and')) && lines[i + 1]) {
        candidate += ' ' + lines[i + 1].trim();
      }
      if (isValidTitle(candidate) && candidate.length > 5) return candidate;
    }
  }

  // 2. Check if top 1-3 lines form a combined headline before metadata labels
  const topHeaderLines: string[] = [];
  for (let i = 0; i < Math.min(6, lines.length); i++) {
    const l = lines[i];
    if (
      /^(?:industry|client|revenues|years|projects|ninjas|testimonial|clients\s+testimonial|\$10b\+)/i.test(l) ||
      l.toLowerCase().includes('client revenues')
    ) {
      break;
    }
    topHeaderLines.push(l);
  }

  if (topHeaderLines.length > 0) {
    const combinedTop = topHeaderLines.join(' ').trim();
    if (isValidTitle(combinedTop) && combinedTop.length >= 8 && combinedTop.length <= 150) {
      return combinedTop;
    }
  }

  // 3. Transformation story pattern
  const storyMatch = lines.find((l) => isValidTitle(l) && /^(?:a\s+.*|\b.*)\s+(?:case study|story|transformation)\b/i.test(l));
  if (storyMatch) return storyMatch;

  // 4. First valid heading line
  for (const l of lines) {
    if (
      isValidTitle(l) &&
      l.length > 8 &&
      !/^(?:industry|client|revenues|years|projects|ninjas|shipping|how\s+cis|\$10b\+)/i.test(l) &&
      !l.includes('$') &&
      !l.includes('%')
    ) {
      return l;
    }
  }

  return pdfFileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
}

function testRefinedClient(text: string): string {
  // Pattern 1: About the Client <Name> ...
  const aboutMatch = text.match(/about\s+the\s+client\s+([A-Z][A-Za-z0-9\s&,.-]+?)(?:\s+is|\s+was|\s+provides|\s+operates|\s+has|\n|\.)/i);
  if (aboutMatch && aboutMatch[1]?.trim()) {
    const c = aboutMatch[1].trim();
    if (isValidTitle(c) && c.length >= 2 && c.length <= 60 && !/^(?:the|an|a)$/i.test(c)) {
      return c;
    }
  }

  // Pattern 2: Client: <Name> or Customer: <Name>
  const clientMatch = text.match(/(?:client|customer|organization):\s*([^\n]+)/i);
  if (clientMatch && clientMatch[1]?.trim()) {
    const c = clientMatch[1].trim();
    if (isValidTitle(c) && c.length <= 60) return c;
  }

  // Pattern 3: Helped <Name> scale/transform/implement...
  const helpedMatch = text.match(/helped\s+([A-Z][A-Za-z0-9\s]+?)\s+(?:go|scale|transform|implement|migrate)/i);
  if (helpedMatch && helpedMatch[1]?.trim() && !helpedMatch[1].toLowerCase().includes('deliver')) {
    const c = helpedMatch[1].trim();
    if (isValidTitle(c) && c.length <= 60) return c;
  }

  return '';
}

function testRefinedDescription(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Look for Executive Summary, Overview, Project Overview, Domain Landscape, A Brief Introduction
  const headings = [/^(?:executive summary|project overview|overview|domain landscape|a brief introduction|about the client):/i];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (headings.some((h) => h.test(l))) {
      const pLines: string[] = [];
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const nextLine = lines[j];
        if (/^(?:challenge|solution|problem|key results|results|technologies|services|industry):/i.test(nextLine)) {
          break;
        }
        pLines.push(nextLine);
      }
      if (pLines.length > 0) return pLines.join(' ');
    }
  }

  // Fallback: look for "How CIS helped..." or first 2-sentence paragraph after header
  const howLine = lines.find((l) => /^how\s+cis\s+/i.test(l) || /^in\s+today's\s+/i.test(l) || /^amcor\s+develops\s+/i.test(l));
  if (howLine) return howLine;

  return '';
}

async function runRefinementTest() {
  console.log('=== TESTING REFINED METADATA EXTRACTION RULES ===\n');

  for (const file of TEST_FILES) {
    const filePath = path.join(TEST_DIR, file);
    if (!fs.existsSync(filePath)) continue;

    const buffer = fs.readFileSync(filePath);
    const pdfExtraction = await extractTextFromPDF(buffer, file);

    console.log(`--------------------------------------------------`);
    console.log(`FILE: ${file}`);
    console.log(`Extracted Title: "${testRefinedTitle(pdfExtraction.text, file)}"`);
    console.log(`Extracted Client: "${testRefinedClient(pdfExtraction.text)}"`);
    console.log(`Extracted Description: "${testRefinedDescription(pdfExtraction.text)}"`);
  }
}

runRefinementTest().catch(console.error);
