import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { CaseStudyModel } from '@/lib/models/CaseStudy';
import { deleteFile } from '@/lib/storage/backblaze';
import { mockDbStore } from '../route';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requestedStatus = request.nextUrl.searchParams.get('status');

    let isDbConnected = true;
    try {
      await connectToDatabase();
    } catch (err) {
      console.warn('[API /api/case-studies/[id] GET] MongoDB unconfigured. Falling back to in-memory store.');
      isDbConnected = false;
    }

    if (!isDbConnected) {
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

    // Query MongoDB by _id or slug
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    const queryCond = isValidObjectId
      ? { $or: [{ _id: id }, { slug: id }] }
      : { slug: id };

    const doc = await CaseStudyModel.findOne(queryCond).lean();

    if (!doc) {
      return NextResponse.json({ error: 'Case study not found' }, { status: 404 });
    }

    const item = {
      ...doc,
      id: doc._id.toString(),
      _id: undefined,
      __v: undefined,
    };

    if (requestedStatus !== 'all' && item.status !== 'published') {
      return NextResponse.json({ error: 'Case study not found' }, { status: 404 });
    }

    return NextResponse.json({ data: item });
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

    let isDbConnected = true;
    try {
      await connectToDatabase();
    } catch (err) {
      console.warn('[API /api/case-studies/[id] PUT] MongoDB unconfigured. Falling back to in-memory store.');
      isDbConnected = false;
    }

    if (!isDbConnected) {
      const existing = mockDbStore.get(id) || { id };
      const updated = { ...existing, ...body, updated_at: new Date().toISOString() };
      mockDbStore.set(id, updated);
      return NextResponse.json({ data: updated });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date(),
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

    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    const queryCond = isValidObjectId
      ? { $or: [{ _id: id }, { slug: id }] }
      : { slug: id };

    const updatedDoc = await CaseStudyModel.findOneAndUpdate(queryCond, updatePayload, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updatedDoc) {
      return NextResponse.json({ error: 'Case study record not found to update.' }, { status: 404 });
    }

    const item = {
      ...updatedDoc,
      id: updatedDoc._id.toString(),
      _id: undefined,
      __v: undefined,
    };

    return NextResponse.json({ data: item });
  } catch (err: any) {
    console.error('[API /api/case-studies/[id] PUT] Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let isDbConnected = true;
    try {
      await connectToDatabase();
    } catch (err) {
      console.warn('[API /api/case-studies/[id] DELETE] MongoDB unconfigured. Falling back to in-memory store.');
      isDbConnected = false;
    }

    if (!isDbConnected) {
      mockDbStore.delete(id);
      return NextResponse.json({ success: true });
    }

    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    const queryCond = isValidObjectId
      ? { $or: [{ _id: id }, { slug: id }] }
      : { slug: id };

    const record = await CaseStudyModel.findOne(queryCond).lean();

    if (record?.pdf_storage_key) {
      await deleteFile(record.pdf_storage_key);
    }

    await CaseStudyModel.deleteOne(queryCond);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API /api/case-studies/[id] DELETE] Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
