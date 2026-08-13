import fs from 'fs';

function isValidTitle(title: string): boolean {
  if (!title || typeof title !== 'string') return false;
  const clean = title.trim();
  if (clean.length < 3 || clean.length > 250) return false;

  // Reject titles with replacement chars or control chars
  if (clean.includes('\uFFFD') || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(clean)) return false;

  // Reject titles starting with suspicious pdf binary strings or single letter + garbled chars
  if (/^u[\u0000-\x1F\x7F-\xFF]/i.test(clean) || /^%PDF/i.test(clean) || /^\d+$/i.test(clean)) return false;

  // Must contain at least one readable word (2+ letters)
  if (!/[a-zA-Z]{2,}/.test(clean)) return false;

  return true;
}

function extractBestTitleFromText(text: string, pdfFileName?: string): string {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let rawTitle = '';

  // 1. Explicit title label
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const l = lines[i];
    if (/^(?:case study|title):?\s*/i.test(l)) {
      rawTitle = l.replace(/^(?:case study|title):?\s*/i, '').trim();
      if (lines[i + 1] && (rawTitle.endsWith('&') || rawTitle.toLowerCase().endsWith('and'))) {
        rawTitle += ' ' + lines[i + 1].trim();
      }
      if (isValidTitle(rawTitle)) return rawTitle;
    }
  }

  // 2. Specific case study / transformation story pattern
  const storyMatch = lines.find((l) => isValidTitle(l) && (
    /^(?:a\s+.*|\b.*)\s+(?:case study|story|transformation)\b/i.test(l) ||
    /transformation\s+story/i.test(l)
  ));
  if (storyMatch) return storyMatch;

  // 3. Multi-word title ending with & or and
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const l = lines[i];
    if ((l.endsWith('&') || l.toLowerCase().endsWith('and')) && lines[i + 1]) {
      const combined = `${l} ${lines[i + 1]}`;
      if (isValidTitle(combined) && combined.length < 150) {
        return combined;
      }
    }
  }

  // 4. First meaningful line that is not a tag/statistic/header
  for (const l of lines) {
    if (
      isValidTitle(l) &&
      l.length > 5 &&
      !/^(?:industry|client|revenue|years|projects|ninjas|shipping|how\s+cis)/i.test(l) &&
      !l.includes('$') &&
      !l.includes('%')
    ) {
      return l;
    }
  }

  // 5. Final Fallback: Sanitized filename
  return pdfFileName ? pdfFileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ') : 'Untitled Case Study';
}

async function testTitleExtractor() {
  const file = 'D:\\Downloads\\new-case-study\\DevOps.pdf';
  const buffer = fs.readFileSync(file);
  const pdfParseModule = require('pdf-parse');
  const parser = new pdfParseModule.PDFParse(new Uint8Array(buffer));
  await parser.load();
  const res = await parser.getText();
  const text = typeof res === 'string' ? res : res.text;

  const bestTitle = extractBestTitleFromText(text, 'DevOps.pdf');
  console.log('Extracted DevOps Title:', bestTitle);
}

testTitleExtractor().catch(console.error);
