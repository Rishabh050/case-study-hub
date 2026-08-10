import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// In-memory fallback store when Supabase credentials are missing/placeholder
export const mockDbStore = new Map<string, any>();


function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim() || '';
    const industry = searchParams.get('industry') || '';
    const technology = searchParams.get('technology') || '';
    const service = searchParams.get('service') || '';
    const tag = searchParams.get('tag') || '';
    const statusParam = searchParams.get('status');
    const featuredOnly = searchParams.get('featured') === 'true';
    const sort = searchParams.get('sort') || 'newest';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(200, parseInt(searchParams.get('limit') || '12', 10)));

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Fallback mode if Supabase URL is unconfigured / placeholder
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      let items = Array.from(mockDbStore.values());

      if (statusParam && statusParam !== 'all') {
        items = items.filter((i) => i.status === statusParam);
      } else if (!statusParam) {
        items = items.filter((i) => i.status === 'published');
      }

      if (featuredOnly) {
        items = items.filter((i) => i.featured);
      }

      if (industry) {
        items = items.filter((i) => (i.industry || '').toLowerCase() === industry.toLowerCase());
      }

      if (query) {
        const q = query.toLowerCase();
        items = items.filter(
          (i) =>
            (i.title || '').toLowerCase().includes(q) ||
            (i.description || '').toLowerCase().includes(q) ||
            (i.industry || '').toLowerCase().includes(q)
        );
      }

      const total = items.length;
      const totalPages = Math.ceil(total / limit);
      const paginated = items.slice((page - 1) * limit, page * limit);

      const industries = Array.from(new Set(items.map((r) => r.industry).filter(Boolean))).sort() as string[];
      const technologies = Array.from(new Set(items.flatMap((r) => r.technologies || []))).sort() as string[];
      const services = Array.from(new Set(items.flatMap((r) => r.services || []))).sort() as string[];
      const tags = Array.from(new Set(items.flatMap((r) => r.tags || []))).sort() as string[];

      return NextResponse.json({
        data: paginated,
        total,
        page,
        limit,
        totalPages,
        industries,
        technologies,
        services,
        tags,
      });
    }

    const supabase = createAdminClient();

    let dbQuery = supabase.from('case_studies').select('*', { count: 'exact' });

    if (statusParam && statusParam !== 'all') {
      dbQuery = dbQuery.eq('status', statusParam);
    } else if (!statusParam) {
      dbQuery = dbQuery.eq('status', 'published');
    }

    if (featuredOnly) {
      dbQuery = dbQuery.eq('featured', true);
    }

    if (industry) {
      dbQuery = dbQuery.ilike('industry', industry);
    }

    if (technology) {
      dbQuery = dbQuery.contains('technologies', [technology]);
    }

    if (service) {
      dbQuery = dbQuery.contains('services', [service]);
    }

    if (tag) {
      dbQuery = dbQuery.contains('tags', [tag]);
    }

    if (query) {
      dbQuery = dbQuery.or(
        `title.ilike.%${query}%,description.ilike.%${query}%,industry.ilike.%${query}%,client_name.ilike.%${query}%,challenge.ilike.%${query}%,solution.ilike.%${query}%`
      );
    }

    switch (sort) {
      case 'oldest':
        dbQuery = dbQuery.order('created_at', { ascending: true });
        break;
      case 'a-z':
        dbQuery = dbQuery.order('title', { ascending: true });
        break;
      case 'featured':
        dbQuery = dbQuery.order('featured', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'newest':
      default:
        dbQuery = dbQuery.order('created_at', { ascending: false });
        break;
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    dbQuery = dbQuery.range(from, to);

    const { data, count, error } = await dbQuery;

    if (error) {
      console.error('[API /api/case-studies GET] Supabase error:', error);
      return NextResponse.json({
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        industries: [],
        technologies: [],
        services: [],
        tags: [],
      });
    }

    const items = data || [];
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    const { data: allRecords } = await supabase.from('case_studies').select('industry, technologies, services, tags');

    const industries = Array.from(
      new Set((allRecords || []).map((r) => r.industry).filter(Boolean) as string[])
    ).sort();

    const technologies = Array.from(
      new Set((allRecords || []).flatMap((r) => r.technologies || []))
    ).sort();

    const services = Array.from(
      new Set((allRecords || []).flatMap((r) => r.services || []))
    ).sort();

    const tags = Array.from(
      new Set((allRecords || []).flatMap((r) => r.tags || []))
    ).sort();

    return NextResponse.json({
      data: items,
      total,
      page,
      limit,
      totalPages,
      industries,
      technologies,
      services,
      tags,
    });
  } catch (err) {
    console.error('[API /api/case-studies GET] Unexpected error:', err);
    return NextResponse.json({
      data: [],
      total: 0,
      page: 1,
      limit: 12,
      totalPages: 0,
      industries: [],
      technologies: [],
      services: [],
      tags: [],
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const {
      title,
      description,
      industry,
      technologies,
      services,
      tags,
      client_name,
      challenge,
      solution,
      key_results,
      pdf_file_name,
      pdf_storage_key,
      pdf_url,
      thumbnail_url,
      status = 'draft',
      featured = false,
    } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    let baseSlug = slugify(title);
    if (!baseSlug) baseSlug = `case-study-${Date.now()}`;

    const newRecord = {
      id: `cs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title,
      slug: baseSlug,
      description: description || null,
      industry: industry || null,
      technologies: Array.isArray(technologies) ? technologies : [],
      services: Array.isArray(services) ? services : [],
      tags: Array.isArray(tags) ? tags : [],
      client_name: client_name || null,
      challenge: challenge || null,
      solution: solution || null,
      key_results: Array.isArray(key_results) ? key_results : [],
      pdf_file_name: pdf_file_name || null,
      pdf_storage_key: pdf_storage_key || null,
      pdf_url: pdf_url || null,
      thumbnail_url: thumbnail_url || null,
      status: ['draft', 'published', 'archived'].includes(status) ? status : 'draft',
      featured: Boolean(featured),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null,
    };

    // Store in mock DB cache for dev fallback
    mockDbStore.set(newRecord.id, newRecord);

    // If Supabase URL is placeholder / unconfigured, return success with demo record
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      return NextResponse.json({ data: newRecord }, { status: 201 });
    }

    const supabase = createAdminClient();

    let finalSlug = baseSlug;
    let counter = 1;
    while (true) {
      const { data: existing } = await supabase
        .from('case_studies')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle();

      if (!existing) break;
      finalSlug = `${baseSlug}-${counter++}`;
    }

    const dbInsertPayload = { ...newRecord, slug: finalSlug };
    delete (dbInsertPayload as any).id;

    const { data, error } = await supabase
      .from('case_studies')
      .insert(dbInsertPayload)
      .select()
      .single();

    if (error) {
      console.error('[API /api/case-studies POST] Insert error:', error);
      return NextResponse.json({ data: { ...newRecord, slug: finalSlug } }, { status: 201 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error('[API /api/case-studies POST] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
