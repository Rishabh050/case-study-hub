'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Building2,
  Cpu,
  Layers,
  Tag,
  Plus,
  Trash2,
} from 'lucide-react';
import { CaseStudy, CaseStudyStatus, KeyResultItem } from '@/lib/types/case-study';

export default function EditCaseStudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [clientName, setClientName] = useState('');
  const [challenge, setChallenge] = useState('');
  const [solution, setSolution] = useState('');
  const [technologiesInput, setTechnologiesInput] = useState('');
  const [servicesInput, setServicesInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [keyResults, setKeyResults] = useState<KeyResultItem[]>([]);
  const [status, setStatus] = useState<CaseStudyStatus>('draft');
  const [featured, setFeatured] = useState(false);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfStorageKey, setPdfStorageKey] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/case-studies/${id}?status=all`);

        if (res.ok) {
          const json = await res.json();
          const study: CaseStudy = json.data;
          setTitle(study.title || '');
          setSlug(study.slug || '');
          setDescription(study.description || '');
          setIndustry(study.industry || '');
          setClientName(study.client_name || '');
          setChallenge(study.challenge || '');
          setSolution(study.solution || '');
          setTechnologiesInput((study.technologies || []).join(', '));
          setServicesInput((study.services || []).join(', '));
          setTagsInput((study.tags || []).join(', '));
          setKeyResults(study.key_results || []);
          setStatus(study.status || 'draft');
          setFeatured(study.featured || false);
          setPdfFileName(study.pdf_file_name);
          setPdfStorageKey(study.pdf_storage_key);
        }
      } catch (err) {
        console.error('Error loading case study edit:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const addKeyResult = () => {
    setKeyResults([...keyResults, { statement: '', value: '', metric: '' }]);
  };

  const updateKeyResult = (index: number, field: keyof KeyResultItem, val: string) => {
    const updated = [...keyResults];
    updated[index] = { ...updated[index], [field]: val };
    setKeyResults(updated);
  };

  const removeKeyResult = (index: number) => {
    setKeyResults(keyResults.filter((_, idx) => idx !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const technologies = technologiesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const services = servicesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const tags = tagsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        title,
        slug,
        description,
        industry,
        client_name: clientName,
        challenge,
        solution,
        technologies,
        services,
        tags,
        key_results: keyResults.filter((k) => k.statement.trim().length > 0),
        status,
        featured,
      };

      const res = await fetch(`/api/case-studies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to update case study');
      }

      router.push('/admin/case-studies');
    } catch (err: any) {
      setErrorMsg(err.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-200 rounded w-3/4" />
          <div className="h-64 bg-gray-200 rounded w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Link
                href="/admin/case-studies"
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Case Studies Table</span>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Edit Case Study Metadata
              </h1>
            </div>

            {(pdfFileName || pdfStorageKey) && (
              <a
                href={`/api/pdf/download?key=${encodeURIComponent(pdfFileName || pdfStorageKey || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
              >
                <span>View Source PDF</span>
              </a>
            )}
          </div>

        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-6">
            {/* Title & Slug */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Industry & Client */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Industry</span>
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Tech, Services, Tags */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  <span>Technologies</span>
                </label>
                <input
                  type="text"
                  value={technologiesInput}
                  onChange={(e) => setTechnologiesInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  <span>Services</span>
                </label>
                <input
                  type="text"
                  value={servicesInput}
                  onChange={(e) => setServicesInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tags</span>
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Challenge & Solution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Challenge
                </label>
                <textarea
                  rows={4}
                  value={challenge}
                  onChange={(e) => setChallenge(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Solution
                </label>
                <textarea
                  rows={4}
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Key Results */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Key Results Metrics
                </label>
                <button
                  type="button"
                  onClick={addKeyResult}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Metric</span>
                </button>
              </div>

              <div className="space-y-3">
                {keyResults.map((kr, idx) => (
                  <div key={idx} className="flex gap-3 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <input
                      type="text"
                      value={kr.value || ''}
                      onChange={(e) => updateKeyResult(idx, 'value', e.target.value)}
                      placeholder="Value"
                      className="w-28 px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs font-bold text-gray-900"
                    />
                    <input
                      type="text"
                      value={kr.statement}
                      onChange={(e) => updateKeyResult(idx, 'statement', e.target.value)}
                      placeholder="Result statement"
                      className="flex-1 px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => removeKeyResult(idx)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Status & Featured */}
            <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-6 items-center justify-between">
              <div className="flex items-center space-x-3">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Status:
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CaseStudyStatus)}
                  className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-900"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-featured"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="edit-featured" className="text-sm font-semibold text-gray-800">
                  Featured Case Study
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Link
              href="/admin/case-studies"
              className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Metadata'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
