'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  CheckCircle,
  Clock,
  Star,
  PlusCircle,
  UploadCloud,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { CaseStudy } from '@/lib/types/case-study';
import { formatCaseStudyDate } from '@/lib/utils/date';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    drafts: 0,
    featured: 0,
  });
  const [recentStudies, setRecentStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        // Fetch published, draft, archived
        const resAll = await fetch('/api/case-studies?limit=100&status=');
        if (resAll.ok) {
          const json = await resAll.json();
          const items: CaseStudy[] = json.data || [];
          setStats({
            total: json.total || items.length,
            published: items.filter((i) => i.status === 'published').length,
            drafts: items.filter((i) => i.status === 'draft').length,
            featured: items.filter((i) => i.featured).length,
          });
          setRecentStudies(items.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Admin Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 mb-2">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>Admin Control Center</span>
            </span>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Case Study Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage company case study PDFs, AI metadata extraction, and library publishing.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/case-studies/import"
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-sm rounded-lg transition-colors"
            >
              <UploadCloud className="w-4 h-4 text-gray-600" />
              <span>Bulk Import (61 PDFs)</span>
            </Link>

            <Link
              href="/admin/case-studies/new"
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Upload New PDF</span>
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Case Studies */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Case Studies</p>
              <h3 className="mt-1 text-3xl font-extrabold text-gray-900">{stats.total}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          {/* Published */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Published</p>
              <h3 className="mt-1 text-3xl font-extrabold text-emerald-600">{stats.published}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>

          {/* Drafts */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Drafts (Pending Review)</p>
              <h3 className="mt-1 text-3xl font-extrabold text-amber-600">{stats.drafts}</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Featured */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Featured</p>
              <h3 className="mt-1 text-3xl font-extrabold text-purple-600">{stats.featured}</h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Star className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Action Callout Section */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 sm:p-8 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold">PDF Metadata AI Processing Engine</h2>
            <p className="mt-1 text-sm text-blue-200 max-w-2xl leading-relaxed">
              Upload single PDF files or launch bulk imports. Extracted text is processed via modular AI analysis to generate draft metadata for admin verification prior to publication.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 flex-shrink-0">
            <Link
              href="/admin/case-studies"
              className="px-5 py-2.5 bg-white text-gray-900 font-bold text-sm rounded-lg hover:bg-gray-100 transition-colors shadow"
            >
              Manage Repository Table
            </Link>
          </div>
        </div>

        {/* Recently Added Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-gray-900">Recently Added Case Studies</h2>
            <Link
              href="/admin/case-studies"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>View all in table</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500 animate-pulse">Loading recent records...</div>
          ) : recentStudies.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentStudies.map((study) => (
                <div key={study.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/case-studies/${study.id}/edit`}
                      className="font-bold text-sm text-gray-900 hover:text-blue-600 truncate block"
                    >
                      {study.title}
                    </Link>
                    <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                      <span>Industry: {study.industry || 'N/A'}</span>
                      <span>&bull;</span>
                      <span>Added: {formatCaseStudyDate(study)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        study.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : study.status === 'draft'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {study.status.toUpperCase()}
                    </span>

                    <Link
                      href={`/admin/case-studies/${study.id}/edit`}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-gray-500">
              No case studies found in the database yet. Click "Upload New PDF" above to add your first record.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
