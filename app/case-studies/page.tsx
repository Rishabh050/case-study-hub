'use client';

import { useState, useEffect, useCallback } from 'react';
import { CaseStudy, CaseStudyListResponse } from '@/lib/types/case-study';
import { CaseStudyCard } from '@/components/case-studies/CaseStudyCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';

export default function CaseStudyLibraryPage() {
  const [data, setData] = useState<CaseStudyListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedTechnology, setSelectedTechnology] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedSort, setSelectedSort] = useState<'newest' | 'oldest' | 'a-z' | 'featured'>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCaseStudies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('query', searchQuery);
      if (selectedIndustry) params.set('industry', selectedIndustry);
      if (selectedTechnology) params.set('technology', selectedTechnology);
      if (selectedService) params.set('service', selectedService);
      if (selectedTag) params.set('tag', selectedTag);
      if (selectedSort) params.set('sort', selectedSort);
      params.set('page', currentPage.toString());
      params.set('limit', '12');

      const res = await fetch(`/api/case-studies?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch case studies:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedIndustry, selectedTechnology, selectedService, selectedTag, selectedSort, currentPage]);

  useEffect(() => {
    fetchCaseStudies();
  }, [fetchCaseStudies]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedIndustry('');
    setSelectedTechnology('');
    setSelectedService('');
    setSelectedTag('');
    setSelectedSort('newest');
    setCurrentPage(1);
  };

  const activeFilterCount =
    (selectedIndustry ? 1 : 0) +
    (selectedTechnology ? 1 : 0) +
    (selectedService ? 1 : 0) +
    (selectedTag ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Header Banner */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="max-w-3xl">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 mb-3">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Internal Case Study Repository
            </span>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
              Enterprise Case Study Library
            </h1>
            <p className="mt-2 text-base text-gray-600 leading-relaxed">
              Explore past client achievements, technical solutions, and verified outcomes. Fast search across industries, technologies, and services.
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls Bar: Search & Sorting */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search title, description, tech, or tags..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Selection & Total Count */}
          <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
              <span className="font-medium hidden sm:inline">Sort by:</span>
              <select
                value={selectedSort}
                onChange={(e) => {
                  setSelectedSort(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="a-z">Alphabetical (A-Z)</option>
                <option value="featured">Featured First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold text-gray-900">Filter Case Studies</span>
              {activeFilterCount > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {activeFilterCount} active
                </span>
              )}
            </div>

            {(activeFilterCount > 0 || searchQuery) && (
              <button
                onClick={handleClearFilters}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset all filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
            {/* Industry Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Industry</label>
              <select
                value={selectedIndustry}
                onChange={(e) => {
                  setSelectedIndustry(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="">All Industries</option>
                {data?.industries.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            {/* Technology Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Technology</label>
              <select
                value={selectedTechnology}
                onChange={(e) => {
                  setSelectedTechnology(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="">All Technologies</option>
                {data?.technologies.map((tech) => (
                  <option key={tech} value={tech}>
                    {tech}
                  </option>
                ))}
              </select>
            </div>

            {/* Services Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Services</label>
              <select
                value={selectedService}
                onChange={(e) => {
                  setSelectedService(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="">All Services</option>
                {data?.services.map((srv) => (
                  <option key={srv} value={srv}>
                    {srv}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Tags</label>
              <select
                value={selectedTag}
                onChange={(e) => {
                  setSelectedTag(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="">All Tags</option>
                {data?.tags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600 font-medium">
            Showing <span className="font-bold text-gray-900">{data?.data.length || 0}</span> of{' '}
            <span className="font-bold text-gray-900">{data?.total || 0}</span> case studies
          </p>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-200 p-6 h-64 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-6" />
                <div className="flex gap-2 mt-auto">
                  <div className="h-5 bg-gray-200 rounded w-16" />
                  <div className="h-5 bg-gray-200 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : data && data.data.length > 0 ? (
          /* Grid of Case Studies */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.data.map((item) => (
              <CaseStudyCard key={item.id} caseStudy={item} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <EmptyState
            title="No Case Studies Found"
            description="No published case studies match your search criteria. Connect Supabase or add new case studies via the Admin Dashboard."
            onClearFilters={activeFilterCount > 0 || searchQuery ? handleClearFilters : undefined}
            actionHref="/admin/case-studies/new"
            actionText="Upload Case Study PDF"
          />
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="mt-12 flex items-center justify-between border-t border-gray-200 pt-6">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <span className="text-sm font-medium text-gray-600">
              Page {data.page} of {data.totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={currentPage === data.totalPages}
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
