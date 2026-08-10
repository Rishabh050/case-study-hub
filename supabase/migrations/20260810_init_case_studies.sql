-- Migration: Create case_studies table, indexes, and Row Level Security (RLS) policies
-- Date: 2026-08-10

CREATE TABLE IF NOT EXISTS public.case_studies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    industry TEXT,
    technologies TEXT[] DEFAULT '{}'::TEXT[],
    services TEXT[] DEFAULT '{}'::TEXT[],
    tags TEXT[] DEFAULT '{}'::TEXT[],
    client_name TEXT,
    challenge TEXT,
    solution TEXT,
    key_results JSONB DEFAULT '[]'::JSONB,
    pdf_file_name TEXT,
    pdf_storage_key TEXT,
    pdf_url TEXT,
    thumbnail_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_case_studies_updated_at ON public.case_studies;
CREATE TRIGGER set_case_studies_updated_at
BEFORE UPDATE ON public.case_studies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance & scalable search/filtering
CREATE INDEX IF NOT EXISTS idx_case_studies_slug ON public.case_studies(slug);
CREATE INDEX IF NOT EXISTS idx_case_studies_status ON public.case_studies(status);
CREATE INDEX IF NOT EXISTS idx_case_studies_industry ON public.case_studies(industry);
CREATE INDEX IF NOT EXISTS idx_case_studies_featured ON public.case_studies(featured);
CREATE INDEX IF NOT EXISTS idx_case_studies_created_at ON public.case_studies(created_at DESC);

-- GIN indexes for array searching (technologies, services, tags)
CREATE INDEX IF NOT EXISTS idx_case_studies_technologies ON public.case_studies USING GIN (technologies);
CREATE INDEX IF NOT EXISTS idx_case_studies_services ON public.case_studies USING GIN (services);
CREATE INDEX IF NOT EXISTS idx_case_studies_tags ON public.case_studies USING GIN (tags);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_case_studies_fts ON public.case_studies USING GIN (
    to_tsvector('english', 
        coalesce(title, '') || ' ' || 
        coalesce(description, '') || ' ' || 
        coalesce(industry, '') || ' ' || 
        coalesce(client_name, '') || ' ' || 
        coalesce(challenge, '') || ' ' || 
        coalesce(solution, '')
    )
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.case_studies ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public read access for published case studies
CREATE POLICY "Public case studies are viewable by everyone"
ON public.case_studies
FOR SELECT
USING (status = 'published');

-- Policy 2: Admin full access for authenticated users
CREATE POLICY "Authenticated admins have full control"
ON public.case_studies
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
