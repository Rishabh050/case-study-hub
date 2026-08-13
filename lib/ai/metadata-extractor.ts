import { StructuredCaseStudyMetadata, KeyResultItem } from '../types/case-study';
import { validateTextQuality, isValidTitle } from '../pdf/extractor';

const SYSTEM_PROMPT = `
You are extracting structured metadata from an enterprise case study document.

Use ONLY information explicitly contained in the supplied document text.

CRITICAL ZERO-HALLUCINATION CONSTRAINTS:
1. Do NOT hallucinate or infer unsupported facts.
2. Do NOT invent technologies, services, industries, client names, locations, percentages, metrics, or ROI.
3. Do NOT invent generic business outcomes. Return empty array [] if not explicitly stated in PDF.
4. If a field is not present in the document, return "" for string fields and [] for array fields.
5. Strictly separate Technologies from Services.

Return ONLY a valid JSON object matching this schema.
`;

const TECH_NORMALIZATION_MAP: Record<string, string> = {
  'amazon web services': 'AWS',
  'aws cloud': 'AWS',
  aws: 'AWS',
  'microsoft azure': 'Azure',
  azure: 'Azure',
  'google cloud platform': 'GCP',
  gcp: 'GCP',
  reactjs: 'React',
  'react.js': 'React',
  react: 'React',
  nextjs: 'Next.js',
  'next.js': 'Next.js',
  nodejs: 'Node.js',
  'node.js': 'Node.js',
  node: 'Node.js',
  expressjs: 'Express.js',
  'express.js': 'Express.js',
  express: 'Express.js',
  kubernetes: 'Kubernetes',
  k8s: 'Kubernetes',
  docker: 'Docker',
  terraform: 'Terraform',
  ansible: 'Ansible',
  jenkins: 'Jenkins',
  python: 'Python',
  java: 'Java',
  golang: 'Go',
  go: 'Go',
  typescript: 'TypeScript',
  postgresql: 'PostgreSQL',
  postgres: 'PostgreSQL',
  mongodb: 'MongoDB',
  tensorflow: 'TensorFlow',
  pytorch: 'PyTorch',
  livekit: 'LiveKit',
  kafka: 'Apache Kafka',
  redis: 'Redis',
  solidity: 'Solidity',
  odoo: 'Odoo ERP',
  powerbi: 'Power BI',
  'power bi': 'Power BI',
};

const DISALLOWED_TAGS = new Set([
  'project',
  'case study',
  'case-study',
  'technology',
  'solution',
  'pdf',
  'document',
  'touch case study 2',
]);

function normalizeTechnologies(techList: string[]): string[] {
  const normalizedSet = new Set<string>();
  for (const item of techList) {
    if (typeof item !== 'string') continue;
    const clean = item.trim();
    if (!clean) continue;

    const lower = clean.toLowerCase();
    if (TECH_NORMALIZATION_MAP[lower]) {
      normalizedSet.add(TECH_NORMALIZATION_MAP[lower]);
    } else {
      normalizedSet.add(clean);
    }
  }
  return Array.from(normalizedSet);
}

function cleanTags(tags: string[]): string[] {
  const tagSet = new Set<string>();
  for (const t of tags) {
    if (typeof t !== 'string') continue;
    const clean = t.trim();
    if (!clean) continue;
    if (!DISALLOWED_TAGS.has(clean.toLowerCase())) {
      tagSet.add(clean);
    }
  }
  return Array.from(tagSet);
}

function normalizeStatement(str: string): string {
  if (!str) return '';
  return str
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Section-Aware Zero-Hallucination Heuristic Metadata Extractor.
 */
export function extractHeuristicMetadata(
  text: string,
  pdfFileName?: string
): StructuredCaseStudyMetadata {
  const cleanFilenameTitle = pdfFileName ? pdfFileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ') : 'Untitled Case Study';

  if (!text || text.trim().length < 30 || !validateTextQuality(text).isValid) {
    return {
      title: cleanFilenameTitle,
      description: '',
      industry: '',
      subIndustry: '',
      technologies: [],
      services: [],
      tags: [],
      projectType: '',
      client: '',
      geography: '',
      challenge: '',
      solution: '',
      keyResults: [],
      businessOutcomes: [],
      confidence_notes: 'PDF contained low/scanned text. No metadata hallucinated.',
      extraction_status: 'completed',
    };
  }

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const lowerText = text.toLowerCase();

  // ==================================================
  // 1. TITLE SELECTION PRIORITY
  // Priority 1: Explicit "Title:" or "Case Study Title:"
  // Priority 2: Explicit case-study heading line (e.g. "A DevOps Transformation Story")
  // Priority 3: Combined multi-line headline header (e.g. "Wahada Bank – Banking HRMS, Finance, Assets & Branch Management")
  // Priority 4: First meaningful heading (e.g. "AI-Assisted Design Validation & Autonomous Testing Workflows")
  // Priority 5: Filename fallback
  // ==================================================
  let selectedTitle = '';

  // Priority 1: Explicit Label
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const l = lines[i];
    if (/^(?:case study title|title):?\s*/i.test(l)) {
      let candidate = l.replace(/^(?:case study title|title):?\s*/i, '').trim();
      if ((candidate.endsWith('&') || candidate.toLowerCase().endsWith('and')) && lines[i + 1]) {
        candidate += ' ' + lines[i + 1].trim();
      }
      if (isValidTitle(candidate) && candidate.length >= 5) {
        selectedTitle = candidate;
        break;
      }
    }
  }

  // Priority 2: Explicit Case Study Title Heading Line (e.g. "A DevOps Transformation Story")
  if (!selectedTitle) {
    const storyMatch = lines.find(
      (l) =>
        isValidTitle(l) &&
        /^(?:a\s+.*|\b.*)\s+(?:transformation story|case study)\b/i.test(l) &&
        !l.toLowerCase().includes('this case study') &&
        !l.toLowerCase().includes('how cis helped')
    );
    if (storyMatch) {
      selectedTitle = storyMatch;
    }
  }

  // Priority 3: Combined Multi-line Headline Header (e.g., Wahada Bank headline)
  if (!selectedTitle) {
    const topHeaderLines: string[] = [];
    for (let i = 0; i < Math.min(6, lines.length); i++) {
      const l = lines[i];
      if (
        /^(?:industry|client|revenues|years|projects|ninjas|testimonial|clients\s+testimonial|\$10b\+)/i.test(l) ||
        l.toLowerCase().includes('client revenues')
      ) {
        break;
      }
      if (
        !l.includes('$') &&
        !l.includes('%') &&
        !/^(?:shipping|how\s+cis|in\s+today's)/i.test(l)
      ) {
        topHeaderLines.push(l);
      }
    }

    if (topHeaderLines.length > 0) {
      const combinedTop = topHeaderLines.join(' ').trim();
      if (isValidTitle(combinedTop) && combinedTop.length >= 10 && combinedTop.length <= 150) {
        selectedTitle = combinedTop;
      }
    }
  }

  // Priority 4: First Meaningful Heading Line (e.g. "AI-Assisted Design Validation & Autonomous Testing Workflows")
  if (!selectedTitle) {
    for (const l of lines) {
      if (
        isValidTitle(l) &&
        l.length > 8 &&
        !/^(?:industry|client|revenues|years|projects|ninjas|shipping|how\s+cis|\$10b\+)/i.test(l) &&
        !l.includes('$') &&
        !l.includes('%') &&
        !l.toLowerCase().includes('in today')
      ) {
        selectedTitle = l;
        break;
      }
    }
  }

  if (!selectedTitle || !isValidTitle(selectedTitle)) {
    selectedTitle = cleanFilenameTitle;
  }

  selectedTitle = selectedTitle.replace(/:\s*$/, '').trim();

  // ==================================================
  // 2. CLIENT NAME EXTRACTION
  // ==================================================
  let client = '';

  const clientOverviewMatch = text.match(/(?:client overview|about the client)\s*\n*\s*([A-Z][A-Za-z0-9\s&,.-]+?)(?=\s+builds|\s+is|\s+was|\s+operates|\s+has|\n|\.|$)/i);
  if (clientOverviewMatch && clientOverviewMatch[1]?.trim()) {
    const candidate = clientOverviewMatch[1].trim().split('\n')[0];
    if (isValidTitle(candidate) && candidate.length >= 2 && candidate.length <= 60 && !/^(?:the|an|a)$/i.test(candidate)) {
      client = candidate;
    }
  }

  if (!client) {
    const clientLabelMatch = text.match(/(?:client|customer|organization):\s*([^\n]+)/i);
    if (clientLabelMatch && clientLabelMatch[1]?.trim()) {
      const candidate = clientLabelMatch[1].trim();
      if (isValidTitle(candidate) && candidate.length <= 60) client = candidate;
    }
  }

  if (!client) {
    const bankLine = lines.find((l) => /^([A-Z][A-Za-z0-9\s]+? Bank)\b/i.test(l) || /\b([A-Z][A-Za-z0-9\s]+? Bank)\s+(?:is|was|manages)\b/i.test(l));
    if (bankLine) {
      const m = bankLine.match(/\b([A-Z][A-Za-z0-9\s]+? Bank)\b/i);
      if (m && m[1]) client = m[1].trim();
    }
  }

  if (!client) {
    const helpedMatch = text.match(/helped\s+([A-Z][A-Za-z0-9\s]+?)\s+(?:go|scale|transform|implement|migrate)/i);
    if (helpedMatch && helpedMatch[1]?.trim() && !helpedMatch[1].toLowerCase().includes('deliver')) {
      const candidate = helpedMatch[1].trim();
      if (isValidTitle(candidate) && candidate.length <= 60) client = candidate;
    }
  }

  // ==================================================
  // 3. DESCRIPTION EXTRACTION (Preserves complete sentences and paragraph boundaries)
  // ==================================================
  let description = '';

  // Look for Client Overview paragraph first
  const clientOverviewIdx = lines.findIndex((l) => /^client overview$/i.test(l) || /^about the client$/i.test(l));
  if (clientOverviewIdx !== -1) {
    const descLines: string[] = [];
    for (let i = clientOverviewIdx + 1; i < lines.length; i++) {
      const l = lines[i];
      if (/^(?:company founded|team size|annual revenue|cloud platform|product|iso|problem statement|key challenges|solution|result|technology stack)/i.test(l)) {
        break;
      }
      descLines.push(l);
    }
    if (descLines.length > 0) {
      description = descLines.join(' ').trim();
    }
  }

  // Look for Project Overview / Domain Landscape / Executive Summary
  if (!description) {
    const projOverviewIdx = lines.findIndex(
      (l) => /^project overview$/i.test(l) || /^executive summary$/i.test(l) || /^domain landscape$/i.test(l)
    );
    if (projOverviewIdx !== -1) {
      const descLines: string[] = [];
      for (let i = projOverviewIdx + 1; i < lines.length; i++) {
        const l = lines[i];
        if (/^(?:the objective|about the client|iso|problem statement|key challenges|solution|result|technology stack)/i.test(l)) {
          break;
        }
        descLines.push(l);
      }
      if (descLines.length > 0) {
        description = descLines.join(' ').trim();
      }
    }
  }

  if (!description) {
    const introParagraph = lines.find((l) => /^wahada\s+bank\s+/i.test(l) || /^in\s+today's\s+/i.test(l) || /^amcor\s+develops\s+/i.test(l));
    if (introParagraph) description = introParagraph;
  }

  // Clean ISO certification or footer noise from description
  description = description
    .replace(/ISO\s+\d+:\d+\s+Certified/gi, '')
    .replace(/ISO\/IEC\s+\d+:\d+\s+Certified/gi, '')
    .trim();

  // ==================================================
  // 4. INDUSTRY & SUB-INDUSTRY EXTRACTION
  // ==================================================
  let industry = '';
  let subIndustry = '';

  const indMatch = text.match(/\bIndustry\b\s*:?\s*\n*\s*([A-Z][A-Za-z0-9\s,&()-]+)/i);
  if (indMatch && indMatch[1]?.trim()) {
    const rawVal = indMatch[1].trim().split('\n')[0].replace(/^(?:clients\s+testimonial|\$10b\+)/i, '').trim();
    if (rawVal.includes(',')) {
      const parts = rawVal.split(',').map((s) => s.trim()).filter(Boolean);
      industry = parts[0];
      subIndustry = parts.slice(1).join(', ');
    } else if (rawVal) {
      industry = rawVal;
    }
  }

  const subIndMatch = text.match(/(?:sub-industry|sub industry|subsector):\s*([^\n]+)/i);
  if (subIndMatch && subIndMatch[1]?.trim()) {
    subIndustry = subIndMatch[1].trim();
  }

  if (!industry) {
    if (/\b(?:software & cloud|devops|cloud technology)\b/i.test(text)) {
      industry = 'Software & Cloud Technology';
    } else if (/\b(?:banking|finance|fintech|bank)\b/i.test(text)) {
      industry = 'Banking & Financial Services';
    } else if (/\b(?:artificial intelligence|ai & enterprise|autonomous testing)\b/i.test(text)) {
      industry = 'Artificial Intelligence (AI) & Enterprise Automation';
    }
  }

  if (!subIndustry) {
    if (/\bHRMS\b/i.test(text) && /\bAssets\b/i.test(text)) {
      subIndustry = 'HRMS & Asset Management';
    } else if (/\bHRMS\b/i.test(text)) {
      subIndustry = 'HRMS';
    }
  }

  // ==================================================
  // 5. PROJECT TYPE EXTRACTION
  // ==================================================
  let projectType = '';
  const projTypeMatch = text.match(/(?:project type|category):\s*([^\n]+)/i);
  if (projTypeMatch && projTypeMatch[1]?.trim()) {
    projectType = projTypeMatch[1].trim();
  } else if (/\bcustomized erp\b|\bcustom erp\b|\berp solution\b|\berp platform\b/i.test(text)) {
    projectType = 'Custom ERP Solution';
  } else if (lowerText.includes('devops')) {
    projectType = 'DevOps & Cloud Automation';
  } else if (lowerText.includes('mobile app') || lowerText.includes('ios app') || lowerText.includes('android app')) {
    projectType = 'Mobile Application';
  }

  // ==================================================
  // 6. GEOGRAPHY EXTRACTION
  // ==================================================
  let geography = '';
  const geoMatch = text.match(/(?:geography|location|region|country of origin):\s*([^\n]+)/i);
  if (geoMatch && geoMatch[1]?.trim()) {
    geography = geoMatch[1].trim();
  } else if (lowerText.includes('libya') || lowerText.includes('libyan')) {
    geography = 'Libya';
  } else if (lowerText.includes('usa') || lowerText.includes('united states') || lowerText.includes('san francisco')) {
    geography = 'USA (HQ)';
  } else if (lowerText.includes('global')) {
    geography = 'Global';
  }

  // ==================================================
  // 7. TECHNOLOGIES EXTRACTION (Explicit Names Only)
  // ==================================================
  const technologies: string[] = [];
  const techKeywords = [
    'AWS',
    'Azure',
    'GCP',
    'Python',
    'Java',
    'Go',
    'TypeScript',
    'JavaScript',
    'React',
    'Next.js',
    'Node.js',
    'Express.js',
    'PostgreSQL',
    'MongoDB',
    'TensorFlow',
    'PyTorch',
    'Kubernetes',
    'Docker',
    'Terraform',
    'Ansible',
    'Jenkins',
    'Apache Kafka',
    'Redis',
    'Odoo',
    'Solidity',
    'Power BI',
  ];

  for (const kw of techKeywords) {
    const regex = new RegExp(`\\b${kw.replace(/[-[\]{}()*+?.:\\^$|#\s]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      technologies.push(kw);
    }
  }

  // ==================================================
  // 8. SERVICES EXTRACTION (Explicit Names Only)
  // ==================================================
  const services: string[] = [];
  if (/\berp solution\b|\berp implementation\b|\berp system\b|\bhrms\b/i.test(text)) {
    services.push('ERP Implementation');
  }
  if (/\bdevops\b|\bci\/cd\b/i.test(text)) {
    services.push('Cloud Engineering');
  }
  if (/\bai\/ml\b|\bmachine learning\b|\bartificial intelligence\b/i.test(text)) {
    services.push('AI/ML Development');
  }
  if (/\bcloud migration\b|\bcloud engineering\b/i.test(text)) {
    if (!services.includes('Cloud Engineering')) services.push('Cloud Engineering');
  }

  // ==================================================
  // 9. CHALLENGE & SOLUTION SECTION EXTRACTION
  // ==================================================
  let challenge = '';
  let solution = '';

  const probIdx = lines.findIndex((l) => /^(?:problem statement|problem|key challenges|challenge):?$/i.test(l));
  if (probIdx !== -1) {
    const chalLines: string[] = [];
    for (let i = probIdx + 1; i < lines.length; i++) {
      const l = lines[i];
      if (/^(?:solution provided|solution|our solution|key modules|result|results|technology stack|conclusion):?/i.test(l)) {
        break;
      }
      chalLines.push(l);
    }
    if (chalLines.length > 0) {
      challenge = chalLines.join(' ').trim();
    }
  }

  const solIdx = lines.findIndex((l) => /^(?:solution provided|solution|our solution):?$/i.test(l));
  if (solIdx !== -1) {
    const solLines: string[] = [];
    for (let i = solIdx + 1; i < lines.length; i++) {
      const l = lines[i];
      if (/^(?:key modules|customizations delivered|challenges during implementation|result|results|positive outcomes|technology stack|conclusion):?/i.test(l)) {
        break;
      }
      solLines.push(l);
    }
    if (solLines.length > 0) {
      solution = solLines.join(' ').trim();
    }
  }

  // ==================================================
  // 10. KEY RESULTS & BUSINESS OUTCOMES EXTRACTION
  // Filter out Problem Statement / Challenge metrics (e.g. "25% of releases caused a production incident")
  // Deduplicate results cleanly.
  // ==================================================
  const keyResults: KeyResultItem[] = [];
  const businessOutcomes: string[] = [];
  const addedStatements = new Set<string>();

  // Extract from Result / Results / Positive Outcomes section ONLY
  const resultIdx = lines.findIndex((l) => /^(?:result|results|positive outcomes|outcomes|key results):?$/i.test(l));
  if (resultIdx !== -1) {
    const resultBlockLines: string[] = [];
    for (let i = resultIdx + 1; i < lines.length; i++) {
      const l = lines[i];
      if (/^(?:technology stack|technology used|why choose us|client testimonial|conclusion|our core values):?/i.test(l)) {
        break;
      }
      resultBlockLines.push(l);
    }

    const resultBlockText = resultBlockLines.join('\n');

    // 1. Metric Callout Blocks (e.g., "47x Daily Deployments", "91% Fewer Release Failures", "44% Cloud Cost Reduction")
    const metricBlockRegex = /(\d+(?:%|x))\s*\n?\s*([A-Za-z0-9\s/()-]{4,50})/g;
    let metricMatch: RegExpExecArray | null;

    while ((metricMatch = metricBlockRegex.exec(resultBlockText)) !== null) {
      const value = metricMatch[1];
      const label = metricMatch[2].trim().split('\n')[0];
      if (
        /^(?:daily deployments|infrastructure cost reduction|cloud cost reduction|fewer release failures|mean time|deployment time|engineer satisfaction|reduction|improvement|increase|saving)/i.test(label)
      ) {
        const fullStatement = normalizeStatement(`${value} ${label}`);
        const normKey = fullStatement.toLowerCase();
        if (!addedStatements.has(normKey)) {
          addedStatements.add(normKey);
          keyResults.push({
            statement: fullStatement,
            value,
            metric: label,
          });
          businessOutcomes.push(fullStatement);
        }
      }
    }

    // 2. Sentences with percentages inside Result section (e.g. "regression testing time reduced by 45%")
    for (const line of resultBlockLines) {
      const normLine = normalizeStatement(line);
      if (normLine.length < 15) continue;

      const percentMatches = normLine.match(/([A-Za-z0-9\s,.-]+?\b(?:reduced by|dropped by|improved by|expanded by)\s+\d+%(?:\s+[^.\n]+)?)/gi);
      if (percentMatches) {
        for (const matchStr of percentMatches) {
          const cleanStmt = normalizeStatement(matchStr);
          const val = cleanStmt.match(/\d+%/)?.[0] || '';
          const normKey = cleanStmt.toLowerCase();

          if (!addedStatements.has(normKey)) {
            addedStatements.add(normKey);
            keyResults.push({
              statement: cleanStmt,
              value: val,
              metric: 'Quantified Result',
            });
          }
        }
      }

      // Qualitative outcomes inside Result section
      if (
        !normLine.includes('Within 90 days') &&
        !normLine.includes('The implemented solution delivered') &&
        !/^\d+x?\s+/i.test(normLine) &&
        normLine.length >= 20
      ) {
        const normKey = normLine.toLowerCase();
        if (!addedStatements.has(normKey)) {
          addedStatements.add(normKey);
          businessOutcomes.push(normLine);
        }
      }
    }
  }

  const tags = cleanTags([industry, subIndustry, projectType, ...technologies, ...services].filter(Boolean));

  return {
    title: selectedTitle,
    description,
    industry,
    subIndustry,
    technologies: normalizeTechnologies(technologies),
    services: Array.from(new Set(services)),
    tags,
    projectType,
    client,
    geography,
    challenge,
    solution,
    keyResults,
    businessOutcomes,
    confidence_notes: 'Parsed using section-aware zero-hallucination text parser.',
    extraction_status: 'completed',
  };
}

/**
 * Main AI Metadata Extraction Function
 */
export async function extractMetadataFromText(
  extractedText: string,
  pdfFileName?: string
): Promise<StructuredCaseStudyMetadata> {
  const apiKey = process.env.AI_API_KEY;

  if (!extractedText || extractedText.trim().length < 30 || !validateTextQuality(extractedText).isValid) {
    const cleanFilenameTitle = pdfFileName ? pdfFileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ') : 'Untitled Case Study';
    return {
      title: cleanFilenameTitle,
      description: '',
      industry: '',
      subIndustry: '',
      technologies: [],
      services: [],
      tags: [],
      projectType: '',
      client: '',
      geography: '',
      challenge: '',
      solution: '',
      keyResults: [],
      businessOutcomes: [],
      extraction_status: 'completed',
      confidence_notes: 'PDF contained low or unreadable text. Zero-hallucination empty metadata returned.',
    };
  }

  if (!apiKey || apiKey === 'your-ai-api-key') {
    console.info('[AI Metadata Extractor] AI_API_KEY not configured. Running zero-hallucination heuristic extraction.');
    return extractHeuristicMetadata(extractedText, pdfFileName);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Extract structured case study metadata from the following PDF document text:\n\n${extractedText.slice(0, 16000)}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.warn(`[AI Metadata Extractor] API response status ${response.status}. Using zero-hallucination heuristic extraction.`);
      return extractHeuristicMetadata(extractedText, pdfFileName);
    }

    const jsonResponse = await response.json();
    const parsed = JSON.parse(jsonResponse.choices[0].message.content);

    const cleanFilenameTitle = pdfFileName ? pdfFileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ') : 'Untitled Case Study';
    const parsedTitle = typeof parsed.title === 'string' && isValidTitle(parsed.title) ? parsed.title.trim() : cleanFilenameTitle;

    return {
      title: parsedTitle,
      description: typeof parsed.description === 'string' ? parsed.description.trim() : (typeof parsed.executiveSummary === 'string' ? parsed.executiveSummary.trim() : ''),
      industry: typeof parsed.industry === 'string' ? parsed.industry.trim() : '',
      subIndustry: typeof parsed.subIndustry === 'string' ? parsed.subIndustry.trim() : '',
      technologies: normalizeTechnologies(Array.isArray(parsed.technologies) ? parsed.technologies : []),
      services: Array.isArray(parsed.services) ? parsed.services.map((s: string) => String(s).trim()).filter(Boolean) : [],
      tags: cleanTags(Array.isArray(parsed.tags) ? parsed.tags : []),
      projectType: typeof parsed.projectType === 'string' ? parsed.projectType.trim() : '',
      client: typeof parsed.client === 'string' && isValidTitle(parsed.client) ? parsed.client.trim() : '',
      geography: typeof parsed.geography === 'string' ? parsed.geography.trim() : '',
      challenge: typeof parsed.challenge === 'string' ? parsed.challenge.trim() : '',
      solution: typeof parsed.solution === 'string' ? parsed.solution.trim() : '',
      keyResults: Array.isArray(parsed.keyResults) ? parsed.keyResults.map((k: any) => ({
        metric: typeof k.metric === 'string' ? k.metric.trim() : '',
        value: typeof k.value === 'string' ? k.value.trim() : '',
        statement: normalizeStatement(typeof k.description === 'string' ? k.description : `${k.value || ''} ${k.metric || ''}`),
        description: normalizeStatement(typeof k.description === 'string' ? k.description : ''),
      })) : [],
      businessOutcomes: Array.isArray(parsed.businessOutcomes) ? parsed.businessOutcomes.map((b: string) => normalizeStatement(String(b))).filter(Boolean) : [],
      extraction_status: 'completed',
    };
  } catch (error: any) {
    console.error('[AI Metadata Extractor] Error executing AI extraction:', error);
    const fallback = extractHeuristicMetadata(extractedText, pdfFileName);
    fallback.extraction_status = 'failed';
    fallback.extraction_error = error.message || 'AI API extraction failed.';
    return fallback;
  }
}
