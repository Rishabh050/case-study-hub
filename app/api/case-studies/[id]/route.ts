import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteFile } from '@/lib/storage/backblaze';
import { mockDbStore } from '../route';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const requestedStatus = request.nextUrl.searchParams.get('status');

    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      let item = mockDbStore.get(id);
      if (!item) {
        item = Array.from(mockDbStore.values()).find((r: any) => r.slug === id);
      }
      if (!item) {
        return NextResponse.json({ error: 'Case study not found' }, { status: 404 });
      }

      if (requestedStatus !== 'all' && item.status !== 'published') {
        return NextResponse.json({ error: 'Case study not found' }, { status: 404 });
      }

      return NextResponse.json({ data: item });
    }


    const supabase = createAdminClient();

    let query = supabase.from('case_studies').select('*').eq('id', id);
    let { data, error } = await query.maybeSingle();

    if (!data) {
      const slugQuery = supabase.from('case_studies').select('*').eq('slug', id);
      const res = await slugQuery.maybeSingle();
      data = res.data;
      error = res.error;
    }

    if (error || !data) {
      return NextResponse.json({ error: 'Case study not found' }, { status: 404 });
    }

    if (requestedStatus !== 'all' && data.status !== 'published') {
      return NextResponse.json({ error: 'Case study not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[API /api/case-studies/[id] GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      const existing = mockDbStore.get(id) || { id };
      const updated = { ...existing, ...body, updated_at: new Date().toISOString() };
      mockDbStore.set(id, updated);
      return NextResponse.json({ data: updated });
    }


    const supabase = createAdminClient();

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    const allowedFields = [
      'title',
      'slug',
      'description',
      'industry',
      'technologies',
      'services',
      'tags',
      'client_name',
      'challenge',
      'solution',
      'key_results',
      'pdf_file_name',
      'pdf_storage_key',
      'pdf_url',
      'thumbnail_url',
      'status',
      'featured',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updatePayload[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from('case_studies')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[API /api/case-studies/[id] PUT] Error:', error);
      return NextResponse.json({ data: { id, ...updatePayload } });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[API /api/case-studies/[id] PUT] Server error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      return NextResponse.json({ success: true });
    }

    const supabase = createAdminClient();

    const { data: record } = await supabase
      .from('case_studies')
      .select('pdf_storage_key')
      .eq('id', id)
      .maybeSingle();

    if (record?.pdf_storage_key) {
      await deleteFile(record.pdf_storage_key);
    }

    const { error } = await supabase.from('case_studies').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API /api/case-studies/[id] DELETE] Server error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
