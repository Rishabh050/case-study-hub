'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { CaseStudy } from '@/lib/types/case-study';
import { Badge } from '@/components/ui/Badge';
import {
  ArrowLeft,
  FileText,
  Download,
  Building2,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Layers,
  Tag,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export default function CaseStudyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [caseStudy, setCaseStudy] = useState<CaseStudy | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    async function loadCaseStudy() {
      try {
        setLoading(true);
        const res = await fetch(`/api/case-studies/${slug}`);
        if (res.ok) {
          const json = await res.json();
          setCaseStudy(json.data);

          if (json.data?.pdf_storage_key) {
            fetchPdfUrl(json.data.pdf_storage_key);
          }
        }
      } catch (err) {
        console.error('Failed to load case study detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCaseStudy();
  }, [slug]);

  const fetchPdfUrl = async (storageKey: string) => {
    try {
      setPdfLoading(true);
      const res = await fetch(`/api/pdf/download?key=${encodeURIComponent(storageKey)}`);
      if (res.ok) {
        const json = await res.json();
        setPdfUrl(json.url);
      }
    } catch (err) {
      console.error('Error fetching presigned PDF URL:', err);
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-200 rounded w-3/4" />
          <div className="h-24 bg-gray-200 rounded w-full" />
          <div className="h-64 bg-gray-200 rounded w-full" />
        </div>
      </div>
    );
  }

  if (!caseStudy) {
    return (
      <div className="min-h-screen bg-slate-50/50 py-16 px-4 text-center">
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Case Study Not Found</h2>
          <p className="mt-2 text-sm text-gray-600">
            The requested case study could not be located or may have been archived.
          </p>
          <div className="mt-6">
            <Link
              href="/case-studies"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Case Study Library</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header Banner */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/case-studies"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Library</span>
          </Link>

          <div className="flex flex-wrap items-center gap-3 mb-3">
            {caseStudy.industry && (
              <span className="inline-flex items-center text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                <Building2 className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                {caseStudy.industry}
              </span>
            )}
            {caseStudy.client_name && (
              <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                Client: {caseStudy.client_name}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
            {caseStudy.title}
          </h1>

          {caseStudy.description && (
            <p className="mt-4 text-base text-gray-600 leading-relaxed font-normal">
              {caseStudy.description}
            </p>
          )}

          {/* Action Bar: View & Download PDF */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3">
              {pdfUrl && pdfUrl !== '#' ? (
                <>
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View PDF Document</span>
                  </a>

                  <a
                    href={`/api/pdf/download?key=${encodeURIComponent(caseStudy.pdf_storage_key || '')}&download=true`}
                    download={caseStudy.pdf_file_name || 'case-study.pdf'}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-semibold text-sm rounded-lg shadow-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </a>
                </>
              ) : (
                <div className="text-xs text-gray-500 bg-gray-100 px-4 py-2.5 rounded-lg border border-gray-200 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>
                    {pdfLoading
                      ? 'Generating secure Backblaze B2 link...'
                      : 'PDF attachment available upon configuring B2 environment variables.'}
                  </span>
                </div>
              )}
            </div>

            <span className="text-xs text-gray-400 font-medium">
              File: {caseStudy.pdf_file_name || 'Original PDF'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Detail Content Grid */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column: Challenge, Solution, Key Results */}
          <div className="lg:col-span-2 space-y-8">
            {/* Key Results Card */}
            {caseStudy.key_results && caseStudy.key_results.length > 0 && (
              <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-lg">
                <div className="flex items-center space-x-2 text-blue-300 font-bold text-xs uppercase tracking-wider mb-4">
                  <TrendingUp className="w-4 h-4" />
                  <span>Verified Key Results</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {caseStudy.key_results.map((res, idx) => (
                    <div key={idx} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15">
                      {res.value && <div className="text-2xl font-black text-blue-200">{res.value}</div>}
                      {res.metric && <div className="text-xs font-semibold text-blue-300 uppercase tracking-wide">{res.metric}</div>}
                      <p className="mt-1 text-sm text-blue-50 font-medium leading-snug">{res.statement}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Challenge Section */}
            {caseStudy.challenge && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2 mb-3">
                  <span className="w-2 h-6 bg-red-500 rounded-full inline-block" />
                  <span>The Challenge</span>
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                  {caseStudy.challenge}
                </p>
              </div>
            )}

            {/* Solution Section */}
            {caseStudy.solution && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2 mb-3">
                  <span className="w-2 h-6 bg-emerald-500 rounded-full inline-block" />
                  <span>The Solution</span>
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                  {caseStudy.solution}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar Column: Metadata, Tech, Services, Tags */}
          <div className="space-y-6">
            {/* Metadata Summary Sidebar Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
              <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3">
                Metadata Breakdown
              </h3>

              {/* Industry & Sub-Industry */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1.5 mb-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Industry</span>
                </label>
                <div className="text-sm font-semibold text-gray-900">
                  {caseStudy.industry || 'Information Technology'}
                  {caseStudy.sub_industry && (
                    <span className="block text-xs font-normal text-gray-500 mt-0.5">{caseStudy.sub_industry}</span>
                  )}
                </div>
              </div>

              {/* Project Type */}
              {caseStudy.project_type && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1.5 mb-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Project Type</span>
                  </label>
                  <div className="text-sm font-semibold text-gray-800 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 inline-block">
                    {caseStudy.project_type}
                  </div>
                </div>
              )}

              {/* Technologies */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1.5 mb-2.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  <span>Technologies</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {caseStudy.technologies && caseStudy.technologies.length > 0 ? (
                    caseStudy.technologies.map((tech, idx) => (
                      <Badge key={idx} variant="blue" size="md">
                        {tech}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">None specified</span>
                  )}
                </div>
              </div>

              {/* Services */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1.5 mb-2.5">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  <span>Services</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {caseStudy.services && caseStudy.services.length > 0 ? (
                    caseStudy.services.map((srv, idx) => (
                      <Badge key={idx} variant="purple" size="md">
                        {srv}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">None specified</span>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1.5 mb-2.5">
                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tags</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {caseStudy.tags && caseStudy.tags.length > 0 ? (
                    caseStudy.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-medium text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200"
                      >
                        #{tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">None specified</span>
                  )}
                </div>
              </div>

              {/* Business Outcomes */}
              {caseStudy.business_outcomes && caseStudy.business_outcomes.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1.5 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Business Outcomes</span>
                  </label>
                  <ul className="space-y-1">
                    {caseStudy.business_outcomes.map((outcome, idx) => (
                      <li key={idx} className="text-xs text-gray-700 flex items-start space-x-1.5">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Document details */}
              <div className="pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-1.5">
                <div>
                  <span className="font-semibold text-gray-700">Published:</span>{' '}
                  {new Date(caseStudy.created_at).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Storage Key:</span>{' '}
                  <span className="font-mono text-[10px] break-all">{caseStudy.pdf_storage_key || 'N/A'}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
