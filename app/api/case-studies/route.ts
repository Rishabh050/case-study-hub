import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { CaseStudyModel } from '@/lib/models/CaseStudy';

import ALL_61_RECORDS from '@/scripts/all_61_published_records.json';

export const mockDbStore = new Map<string, any>();

if (mockDbStore.size === 0) {
  ALL_61_RECORDS.forEach((item: any) => mockDbStore.set(item.id, item));
}



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

    let isDbConnected = true;
    try {
      await connectToDatabase();
    } catch (err) {
      console.warn('[API /api/case-studies GET] MongoDB unconfigured. Falling back to in-memory store.');
      isDbConnected = false;
    }

    // In-memory fallback mode if MongoDB is unconfigured/offline
    if (!isDbConnected) {
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

    // Build MongoDB filter query
    const filter: Record<string, any> = {};

    if (statusParam && statusParam !== 'all') {
      filter.status = statusParam;
    } else if (!statusParam) {
      filter.status = 'published';
    }

    if (featuredOnly) {
      filter.featured = true;
    }

    if (industry) {
      filter.industry = new RegExp(`^${industry}$`, 'i');
    }

    if (technology) {
      filter.technologies = technology;
    }

    if (service) {
      filter.services = service;
    }

    if (tag) {
      filter.tags = tag;
    }

    if (query) {
      const qReg = new RegExp(query, 'i');
      filter.$or = [
        { title: qReg },
        { description: qReg },
        { industry: qReg },
        { client_name: qReg },
        { challenge: qReg },
        { solution: qReg },
        { technologies: qReg },
        { services: qReg },
        { tags: qReg },
      ];
    }

    // Sort order
    let sortOptions: Record<string, any> = { created_at: -1 };
    switch (sort) {
      case 'oldest':
        sortOptions = { created_at: 1 };
        break;
      case 'a-z':
        sortOptions = { title: 1 };
        break;
      case 'featured':
        sortOptions = { featured: -1, created_at: -1 };
        break;
      case 'newest':
      default:
        sortOptions = { created_at: -1 };
        break;
    }

    const total = await CaseStudyModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const docs = await CaseStudyModel.find(filter)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const items = docs.map((d: any) => ({
      ...d,
      id: d._id.toString(),
      _id: undefined,
      __v: undefined,
    }));

    // Fetch aggregate facets
    const allRecords = await CaseStudyModel.find({}, 'industry technologies services tags').lean();

    const industries = Array.from(
      new Set(allRecords.map((r: any) => r.industry).filter(Boolean) as string[])
    ).sort();

    const technologies = Array.from(
      new Set(allRecords.flatMap((r: any) => r.technologies || []))
    ).sort();

    const services = Array.from(
      new Set(allRecords.flatMap((r: any) => r.services || []))
    ).sort();

    const tags = Array.from(
      new Set(allRecords.flatMap((r: any) => r.tags || []))
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
    console.error('[API /api/case-studies GET] Error:', err);
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

    let isDbConnected = true;
    try {
      await connectToDatabase();
    } catch (err) {
      console.warn('[API /api/case-studies POST] MongoDB unconfigured. Falling back to in-memory store.');
      isDbConnected = false;
    }

    const payload = {
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
      created_by: null,
    };

    if (!isDbConnected) {
      const mockRecord = {
        ...payload,
        id: `cs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockDbStore.set(mockRecord.id, mockRecord);
      return NextResponse.json({ data: mockRecord }, { status: 201 });
    }

    let finalSlug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await CaseStudyModel.findOne({ slug: finalSlug });
      if (!existing) break;
      finalSlug = `${baseSlug}-${counter++}`;
    }

    const created = await CaseStudyModel.create({
      ...payload,
      slug: finalSlug,
    });

    const result = created.toObject();

    // Cache in mock store for seamless dev fallback
    mockDbStore.set(result.id, result);

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err: any) {
    console.error('[API /api/case-studies POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
