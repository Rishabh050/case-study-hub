'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  CheckCircle2,
  Sparkles,
  FileText,
  AlertCircle,
  Save,
  ArrowRight,
  Plus,
  Trash2,
  RefreshCw,
  Building2,
  Cpu,
  Layers,
  Tag,
} from 'lucide-react';
import { AIMetadataExtractionResult, KeyResultItem } from '@/lib/types/case-study';

type Step = 1 | 2 | 3 | 4;

export default function NewCaseStudyPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // File & Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Uploaded PDF info
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfStorageKey, setPdfStorageKey] = useState('');
  const [extractedText, setExtractedText] = useState('');

  // Editable Form Metadata State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [clientName, setClientName] = useState('');
  const [challenge, setChallenge] = useState('');
  const [solution, setSolution] = useState('');
  const [technologiesInput, setTechnologiesInput] = useState('');
  const [servicesInput, setServicesInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [keyResults, setKeyResults] = useState<KeyResultItem[]>([]);
  const [featured, setFeatured] = useState(false);
  const [confidenceNotes, setConfidenceNotes] = useState<string | undefined>(undefined);

  // Step 1: File Validation & Drop
  const handleFileSelect = (file: File) => {
    setErrorMsg(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Invalid file format. Please select a PDF document.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('File exceeds maximum size limit of 25MB.');
      return;
    }
    setSelectedFile(file);
  };

  // Step 2 & 3: Upload to B2 -> Extract Text -> Run AI Extraction
  const handleProcessUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setErrorMsg(null);
    setCurrentStep(2);

    try {
      // 1. Upload PDF & Extract Text via Server API
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadRes = await fetch('/api/upload/pdf', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errJson = await uploadRes.json();
        throw new Error(errJson.error || 'Failed to upload PDF to Backblaze B2.');
      }

      const uploadData = await uploadRes.json();
      setPdfFileName(uploadData.pdfFileName);
      setPdfStorageKey(uploadData.storageKey);
      setExtractedText(uploadData.extractedText || '');

      // 2. Trigger AI Metadata Extraction
      setCurrentStep(3);
      const aiRes = await fetch('/api/ai/extract-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: uploadData.extractedText,
          fileName: uploadData.pdfFileName,
        }),
      });

      if (!aiRes.ok) {
        throw new Error('Failed to run AI metadata extraction.');
      }

      const aiData = await aiRes.json();
      const meta: AIMetadataExtractionResult = aiData.metadata;

      // Populate editable form state
      setTitle(meta.title || uploadData.pdfFileName.replace(/\.pdf$/i, ''));
      setDescription(meta.description || '');
      setIndustry(meta.industry || '');
      setClientName(meta.client_name || '');
      setChallenge(meta.challenge || '');
      setSolution(meta.solution || '');
      setTechnologiesInput((meta.technologies || []).join(', '));
      setServicesInput((meta.services || []).join(', '));
      setTagsInput((meta.tags || []).join(', '));
      setKeyResults(meta.key_results || []);
      setConfidenceNotes(meta.confidence_notes);

      // Advance to Admin Review step
      setCurrentStep(4);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during upload processing.');
      setCurrentStep(1);
    } finally {
      setLoading(false);
    }
  };

  // Helper for key results management
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

  // Step 4: Final Save / Publish Action
  const handleSaveCaseStudy = async (targetStatus: 'draft' | 'published') => {
    setLoading(true);
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
        description,
        industry,
        client_name: clientName,
        challenge,
        solution,
        technologies,
        services,
        tags,
        key_results: keyResults.filter((k) => k.statement.trim().length > 0),
        pdf_file_name: pdfFileName,
        pdf_storage_key: pdfStorageKey,
        status: targetStatus,
        featured,
      };

      const res = await fetch('/api/case-studies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to save case study to database.');
      }

      router.push('/admin/case-studies');
    } catch (err: any) {
      setErrorMsg(err.message || 'Save failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Upload & Process Case Study PDF
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Upload a single PDF file. The system will store the file in Backblaze B2, extract raw text, and propose AI-generated metadata for your approval.
          </p>

          {/* Stepper Progress Bar */}
          <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 max-w-2xl">
            <div className={`flex items-center space-x-2 text-xs font-bold ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">1</span>
              <span>Select PDF</span>
            </div>
            <div className="h-px bg-gray-200 flex-1 mx-3" />
            <div className={`flex items-center space-x-2 text-xs font-bold ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">2</span>
              <span>B2 & Extraction</span>
            </div>
            <div className="h-px bg-gray-200 flex-1 mx-3" />
            <div className={`flex items-center space-x-2 text-xs font-bold ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">3</span>
              <span>AI Analysis</span>
            </div>
            <div className="h-px bg-gray-200 flex-1 mx-3" />
            <div className={`flex items-center space-x-2 text-xs font-bold ${currentStep === 4 ? 'text-blue-600' : 'text-gray-400'}`}>
              <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">4</span>
              <span>Review & Save</span>
            </div>
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

        {/* STEP 1: DROPZONE & SELECTION */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center space-y-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files?.[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-10 transition-all ${
                isDragOver ? 'border-blue-500 bg-blue-50/50' : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
              }`}
            >
              <UploadCloud className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-900">
                Drag and drop your case study PDF here
              </h3>
              <p className="text-xs text-gray-500 mt-1">Accepts standard PDF documents up to 25MB</p>

              <div className="mt-4">
                <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold text-xs rounded-lg hover:bg-gray-50 cursor-pointer shadow-sm">
                  <span>Browse Files</span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                    }}
                  />
                </label>
              </div>
            </div>

            {selectedFile && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3 text-left">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready for upload
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleProcessUpload}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors flex items-center space-x-2"
                >
                  <span>Start Extraction & Processing</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2 & 3: PROCESSING SKELETON */}
        {(currentStep === 2 || currentStep === 3) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm text-center space-y-6">
            <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
            <h3 className="text-xl font-bold text-gray-900">
              {currentStep === 2 ? 'Uploading to Backblaze B2 & Extracting Text...' : 'Running AI Metadata Extraction...'}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Please wait while the server securely uploads the PDF to B2 storage and parses text content into structured metadata.
            </p>
          </div>
        )}

        {/* STEP 4: ADMIN METADATA REVIEW & EDIT FORM */}
        {currentStep === 4 && (
          <div className="space-y-8">
            {/* Banner Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-amber-900 text-sm">
              <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Review AI-Generated Metadata</p>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  Verify and edit the proposed metadata below. AI outputs are never published automatically. Once satisfied, click "Save as Draft" or "Publish".
                </p>
                {confidenceNotes && (
                  <p className="text-[11px] font-mono text-amber-700 mt-2 bg-amber-100/50 p-2 rounded">
                    {confidenceNotes}
                  </p>
                )}
              </div>
            </div>

            {/* Form Fields Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-6">
              {/* Title & Client Name */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Case Study Title <span className="text-red-500">*</span>
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
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Executive Summary / Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Industry & Badges Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Industry</span>
                  </label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. Healthcare, Retail"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                    <Cpu className="w-3.5 h-3.5 text-blue-600" />
                    <span>Technologies (Comma Separated)</span>
                  </label>
                  <input
                    type="text"
                    value={technologiesInput}
                    onChange={(e) => setTechnologiesInput(e.target.value)}
                    placeholder="AWS, Next.js, PostgreSQL"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    <span>Services (Comma Separated)</span>
                  </label>
                  <input
                    type="text"
                    value={servicesInput}
                    onChange={(e) => setServicesInput(e.target.value)}
                    placeholder="Cloud Migration, Analytics"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Tags Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tags (Comma Separated)</span>
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Enterprise, High-Scale, Microservices"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Challenge & Solution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Challenge Section
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
                    Solution Section
                  </label>
                  <textarea
                    rows={4}
                    value={solution}
                    onChange={(e) => setSolution(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Key Results Manager */}
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
                        placeholder="Value e.g. 45%"
                        className="w-28 px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs font-bold text-gray-900"
                      />
                      <input
                        type="text"
                        value={kr.statement}
                        onChange={(e) => updateKeyResult(idx, 'statement', e.target.value)}
                        placeholder="Statement e.g. Reduction in infrastructure operating costs"
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

              {/* Featured Checkbox */}
              <div className="pt-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="featured" className="text-sm font-semibold text-gray-800">
                  Mark as Featured Case Study
                </label>
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Change PDF File
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSaveCaseStudy('draft')}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-sm rounded-lg transition-colors border border-gray-300 disabled:opacity-50"
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSaveCaseStudy('published')}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Publish</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
