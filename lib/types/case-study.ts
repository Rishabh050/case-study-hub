export type CaseStudyStatus = 'draft' | 'published' | 'archived';
export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface KeyResultItem {
  metric?: string;
  value?: string;
  statement: string;
  description?: string;
}

export interface StructuredCaseStudyMetadata {
  title: string;
  description?: string | null;
  industry: string;
  subIndustry?: string;
  technologies: string[];
  services: string[];
  tags: string[];
  projectType?: string;
  client?: string;
  client_name?: string | null;
  geography?: string;
  challenge: string;
  solution: string;
  keyResults: KeyResultItem[];
  key_results?: KeyResultItem[];
  businessOutcomes?: string[];
  confidence_notes?: string;
  extraction_status?: ExtractionStatus;
  extraction_error?: string | null;
}

export type AIMetadataExtractionResult = StructuredCaseStudyMetadata;

export interface CaseStudy {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  industry: string | null;
  sub_industry?: string | null;
  technologies: string[];
  services: string[];
  tags: string[];
  project_type?: string | null;
  client_name: string | null;
  geography?: string | null;
  challenge: string | null;
  solution: string | null;
  key_results: KeyResultItem[];
  business_outcomes?: string[];
  pdf_file_name: string | null;
  pdf_storage_key: string | null;
  pdf_url: string | null;
  thumbnail_url: string | null;
  status: CaseStudyStatus;
  extraction_status?: ExtractionStatus;
  extraction_error?: string | null;
  featured: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CaseStudyFilterParams {
  query?: string;
  industry?: string;
  technology?: string;
  service?: string;
  tag?: string;
  projectType?: string;
  status?: CaseStudyStatus;
  featuredOnly?: boolean;
  sort?: 'newest' | 'oldest' | 'a-z' | 'featured';
  page?: number;
  limit?: number;
}

export interface CaseStudyListResponse {
  data: CaseStudy[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  industries: string[];
  technologies: string[];
  services: string[];
  tags: string[];
  projectTypes?: string[];
}

export interface PDFExtractionResult {
  text: string;
  numPages: number;
  info?: Record<string, unknown>;
  hasExtractableText: boolean;
  error?: string;
}

export interface BulkImportItem {
  id: string;
  file?: File;
  fileName: string;
  fileSize: number;
  status: 'pending' | 'uploading' | 'extracting' | 'review' | 'saving' | 'completed' | 'error';
  extractedText?: string;
  storageKey?: string;
  generatedMetadata?: StructuredCaseStudyMetadata;
  error?: string;
  caseStudyId?: string;
}
