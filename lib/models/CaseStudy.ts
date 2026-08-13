import mongoose, { Schema, Model } from 'mongoose';
import { CaseStudy } from '@/lib/types/case-study';

const KeyResultSchema = new Schema(
  {
    metric: { type: String, required: false, default: null },
    value: { type: String, required: false, default: null },
    statement: { type: String, required: true },
    description: { type: String, required: false, default: null },
  },
  { _id: false }
);

const CaseStudySchema = new Schema<CaseStudy>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: null },
    industry: { type: String, default: null, index: true },
    sub_industry: { type: String, default: null },
    client_name: { type: String, default: null },
    geography: { type: String, default: null },
    project_type: { type: String, default: null, index: true },
    challenge: { type: String, default: null },
    solution: { type: String, default: null },
    technologies: { type: [String], default: [], index: true },
    services: { type: [String], default: [], index: true },
    tags: { type: [String], default: [], index: true },
    key_results: { type: [KeyResultSchema], default: [] },
    business_outcomes: { type: [String], default: [] },
    pdf_file_name: { type: String, default: null },
    pdf_storage_key: { type: String, default: null },
    pdf_url: { type: String, default: null },
    thumbnail_url: { type: String, default: null },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    extraction_status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'completed',
      index: true,
    },
    extraction_error: { type: String, default: null },
    featured: { type: Boolean, default: false },
    created_by: { type: String, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        if (ret._id) {
          ret.id = ret._id.toString();
          delete ret._id;
        }
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret: Record<string, any>) {
        if (ret._id) {
          ret.id = ret._id.toString();
          delete ret._id;
        }
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Search text index for full-text queries
CaseStudySchema.index({
  title: 'text',
  description: 'text',
  industry: 'text',
  technologies: 'text',
  services: 'text',
  tags: 'text',
  project_type: 'text',
});

export const CaseStudyModel: Model<CaseStudy> =
  mongoose.models.CaseStudy || mongoose.model<CaseStudy>('CaseStudy', CaseStudySchema, 'case_studies');
