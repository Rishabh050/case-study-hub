'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CaseStudy, CaseStudyStatus } from '@/lib/types/case-study';
import { Modal } from '@/components/ui/Modal';
import {
  PlusCircle,
  Search,
  Edit,
  Trash2,
  Eye,
  Star,
  CheckCircle,
  Clock,
  Archive,
  ArrowUpDown,
  Filter,
  Shield,
} from 'lucide-react';

export default function AdminCaseStudiesPage() {
  const [items, setItems] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<CaseStudy | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStudies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery) params.set('query', searchQuery);

      const res = await fetch(`/api/case-studies?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin case studies:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchStudies();
  }, [fetchStudies]);

  const handleToggleStatus = async (study: CaseStudy, newStatus: CaseStudyStatus) => {
    try {
      const res = await fetch(`/api/case-studies/${study.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchStudies();
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleToggleFeatured = async (study: CaseStudy) => {
    try {
      const res = await fetch(`/api/case-studies/${study.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !study.featured }),
      });
      if (res.ok) {
        fetchStudies();
      }
    } catch (err) {
      console.error('Failed to toggle featured state:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/case-studies/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteTarget(null);
        fetchStudies();
      }
    } catch (err) {
      console.error('Failed to delete case study:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-gray-500 mb-1">
              <Link href="/admin" className="hover:underline">
                Admin
              </Link>
              <span>/</span>
              <span>Case Studies Repository</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Manage Case Studies
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/case-studies/new"
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Case Study</span>
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Filters and Search Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, industry..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-500 uppercase">Status:</span>
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
              {['', 'published', 'draft', 'archived'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                    statusFilter === st ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {st === '' ? 'All' : st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500 animate-pulse">
              Loading repository data...
            </div>
          ) : items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Case Study Title</th>
                    <th className="py-3.5 px-4">Industry</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-center">Featured</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {items.map((study) => (
                    <tr key={study.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Title & Slug */}
                      <td className="py-4 px-6 max-w-xs">
                        <Link
                          href={`/admin/case-studies/${study.id}/edit`}
                          className="font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1"
                        >
                          {study.title}
                        </Link>
                        <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">
                          /{study.slug}
                        </p>
                      </td>

                      {/* Industry */}
                      <td className="py-4 px-4 text-xs font-semibold text-gray-700">
                        {study.industry || '—'}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                            study.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : study.status === 'draft'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {study.status === 'published' && <CheckCircle className="w-3 h-3" />}
                          {study.status === 'draft' && <Clock className="w-3 h-3" />}
                          {study.status === 'archived' && <Archive className="w-3 h-3" />}
                          <span className="capitalize">{study.status}</span>
                        </span>
                      </td>

                      {/* Featured */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleToggleFeatured(study)}
                          className={`p-1 rounded hover:bg-gray-100 transition-colors ${
                            study.featured ? 'text-amber-500' : 'text-gray-300'
                          }`}
                          title="Toggle Featured State"
                        >
                          <Star className={`w-4 h-4 ${study.featured ? 'fill-amber-400' : ''}`} />
                        </button>
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-4 text-xs text-gray-500">
                        {new Date(study.created_at).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/case-studies/${study.slug}`}
                            target="_blank"
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Preview Public Page"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <Link
                            href={`/admin/case-studies/${study.id}/edit`}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit Metadata"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          {/* Quick Publish / Unpublish Toggle */}
                          {study.status === 'published' ? (
                            <button
                              onClick={() => handleToggleStatus(study, 'draft')}
                              className="px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                            >
                              Unpublish
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(study, 'published')}
                              className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                            >
                              Publish
                            </button>
                          )}

                          {/* Delete Modal Trigger */}
                          <button
                            onClick={() => setDeleteTarget(study)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete Case Study"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-gray-500">
              No case studies found matching current filter.
            </div>
          )}
        </div>
      </main>

      {/* Confirmation Modal for Destructive Delete */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Case Study"
        description={`Are you sure you want to permanently delete "${deleteTarget?.title}"? This will remove the case study metadata from Supabase and delete its PDF file from Backblaze B2 storage.`}
        confirmText="Delete Case Study"
        isDestructive
        isLoading={deleting}
      />
    </div>
  );
}
