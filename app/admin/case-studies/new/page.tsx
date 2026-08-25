'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  CheckCircle2,
  Sparkles,
  FileText,
  AlertCircle,
  ArrowRight,
  Plus,
  Trash2,
  RefreshCw,
  Building2,
  Cpu,
  Layers,
  Tag,
} from 'lucide-react';
import { KeyResultItem } from '@/lib/types/case-study';
import { isValidTitle } from '@/lib/pdf/extractor';

type Step = 1 | 2 | 3 | 4;

export default function NewCaseStudyPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // File & Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [textExtractionWarning, setTextExtractionWarning] = useState<string | null>(null);

  // Uploaded PDF info
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfStorageKey, setPdfStorageKey] = useState('');
  const [extractedText, setExtractedText] = useState('');

  // Editable Form Metadata State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [subIndustry, setSubIndustry] = useState('');
  const [projectType, setProjectType] = useState('');
  const [geography, setGeography] = useState('');
  const [clientName, setClientName] = useState('');
  const [challenge, setChallenge] = useState('');
  const [solution, setSolution] = useState('');
  const [technologiesInput, setTechnologiesInput] = useState('');
  const [servicesInput, setServicesInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [businessOutcomesInput, setBusinessOutcomesInput] = useState('');
  const [keyResults, setKeyResults] = useState<KeyResultItem[]>([]);
  const [featured, setFeatured] = useState(false);
  const [confidenceNotes, setConfidenceNotes] = useState<string | undefined>(undefined);

  // Clear Form State between uploads
  const resetFormState = () => {
    setTitle('');
    setDescription('');
    setIndustry('');
    setSubIndustry('');
    setProjectType('');
    setGeography('');
    setClientName('');
    setChallenge('');
    setSolution('');
    setTechnologiesInput('');
    setServicesInput('');
    setTagsInput('');
    setBusinessOutcomesInput('');
    setKeyResults([]);
    setFeatured(false);
    setConfidenceNotes(undefined);
    setTextExtractionWarning(null);
  };

  // Step 1: File Selection & Validation
  const handleFileSelect = (file: File) => {
    setErrorMsg(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Invalid file format. Please select a PDF document.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setErrorMsg('File exceeds maximum size limit of 100MB.');
      return;
    }
    resetFormState();
    setSelectedFile(file);

    console.log('=== REAL FLOW STEP 1 FILE ===', {
      name: file.name,
      sizeBytes: file.size,
      type: file.type,
    });
  };

  // Canonical Form Mapping Function
  const applyExtractedMetadataToForm = (meta: any, fallbackFileName: string) => {
    console.log('=== REAL FLOW STEP 7 NORMALIZED METADATA ===', meta);

    const isTouchFallback = typeof meta?.title === 'string' && meta.title.toLowerCase().startsWith('touch case study');

    const titleCandidate = typeof meta?.title === 'string' ? meta.title.trim() : '';
    const cleanTitle = (isValidTitle(titleCandidate) && !isTouchFallback)
      ? titleCandidate
      : fallbackFileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');

    const cleanDescription = typeof meta?.description === 'string' && meta.description.trim()
      ? meta.description.trim()
      : (typeof meta?.executiveSummary === 'string' && meta.executiveSummary.trim() ? meta.executiveSummary.trim() : (meta?.challenge || ''));

    const cleanIndustry = typeof meta?.industry === 'string' ? meta.industry.trim() : '';
    const cleanSubIndustry = typeof meta?.subIndustry === 'string' ? meta.subIndustry.trim() : (typeof meta?.sub_industry === 'string' ? meta.sub_industry.trim() : '');
    const cleanProjectType = typeof meta?.projectType === 'string' ? meta.projectType.trim() : (typeof meta?.project_type === 'string' ? meta.project_type.trim() : '');
    const cleanGeography = typeof meta?.geography === 'string' ? meta.geography.trim() : '';
    const cleanClientName = typeof meta?.client === 'string' && meta.client.trim() ? meta.client.trim() : (typeof meta?.client_name === 'string' ? meta.client_name.trim() : '');
    const cleanChallenge = typeof meta?.challenge === 'string' ? meta.challenge.trim() : '';
    const cleanSolution = typeof meta?.solution === 'string' ? meta.solution.trim() : '';

    const techArray = Array.isArray(meta?.technologies) ? meta.technologies.map((t: any) => String(t).trim()).filter(Boolean) : [];
    const servArray = Array.isArray(meta?.services) ? meta.services.map((s: any) => String(s).trim()).filter(Boolean) : [];
    const tagsArray = Array.isArray(meta?.tags) ? meta.tags.map((t: any) => String(t).trim()).filter(Boolean) : [];
    const outcomesArray = Array.isArray(meta?.businessOutcomes)
      ? meta.businessOutcomes.map((b: any) => String(b).trim()).filter(Boolean)
      : (Array.isArray(meta?.business_outcomes) ? meta.business_outcomes.map((b: any) => String(b).trim()).filter(Boolean) : []);

    const rawKeyResults = Array.isArray(meta?.keyResults) ? meta.keyResults : (Array.isArray(meta?.key_results) ? meta.key_results : []);
    const cleanKeyResults: KeyResultItem[] = rawKeyResults.map((k: any) => ({
      metric: typeof k.metric === 'string' ? k.metric.trim() : '',
      value: typeof k.value === 'string' ? k.value.trim() : '',
      statement: typeof k.statement === 'string' && k.statement.trim() ? k.statement.trim() : (typeof k.description === 'string' ? k.description.trim() : ''),
    }));

    console.log('=== REAL FLOW STEP 8 FORM STATE ===', {
      title: cleanTitle,
      clientName: cleanClientName,
      description: cleanDescription,
      industry: cleanIndustry,
      subIndustry: cleanSubIndustry,
      projectType: cleanProjectType,
      geography: cleanGeography,
      technologiesCount: techArray.length,
      servicesCount: servArray.length,
      tagsCount: tagsArray.length,
      businessOutcomesCount: outcomesArray.length,
      keyResultsCount: cleanKeyResults.length,
    });

    setTitle(cleanTitle);
    setDescription(cleanDescription);
    setIndustry(cleanIndustry);
    setSubIndustry(cleanSubIndustry);
    setProjectType(cleanProjectType);
    setGeography(cleanGeography);
    setClientName(cleanClientName);
    setChallenge(cleanChallenge);
    setSolution(cleanSolution);
    setTechnologiesInput(techArray.join(', '));
    setServicesInput(servArray.join(', '));
    setTagsInput(tagsArray.join(', '));
    setBusinessOutcomesInput(outcomesArray.join('\n'));
    setKeyResults(cleanKeyResults);
    if (meta?.confidence_notes) setConfidenceNotes(meta.confidence_notes);
  };

  // Step 2 & 3: Upload to B2 -> Extract Text -> Run AI Extraction
  const handleProcessUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setErrorMsg(null);
    resetFormState();
    setCurrentStep(2);

    try {
      console.log('=== REAL FLOW STEP 2 UPLOAD REQUEST ===', { fileName: selectedFile.name, size: selectedFile.size });

      // 1. Upload PDF & Extract Text via Server API
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadRes = await fetch('/api/upload/pdf', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json().catch(() => ({}));

      console.log('=== REAL FLOW STEP 3 UPLOAD RESPONSE ===', {
        status: uploadRes.status,
        pdfFileName: uploadData.pdfFileName,
        storageKey: uploadData.storageKey,
        extractedTextLength: (uploadData.extractedText || '').length,
        hasExtractableText: uploadData.hasExtractableText,
      });

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Failed to upload PDF to Backblaze B2.');
      }

      setPdfFileName(uploadData.pdfFileName);
      setPdfStorageKey(uploadData.storageKey);
      setExtractedText(uploadData.extractedText || '');

      console.log('=== REAL FLOW STEP 4 EXTRACTED TEXT ===', {
        length: (uploadData.extractedText || '').length,
        first500Chars: (uploadData.extractedText || '').slice(0, 500),
      });

      if (!uploadData.extractedText || uploadData.extractedText.trim().length < 30) {
        setTextExtractionWarning(
          'Notice: This PDF contains little or no extractable text (it may be a scanned image or empty document). Please manually enter the metadata fields below.'
        );
      }

      // 2. Trigger AI Metadata Extraction
      setCurrentStep(3);
      console.log('=== REAL FLOW STEP 5 AI REQUEST ===', {
        fileName: uploadData.pdfFileName,
        textLength: (uploadData.extractedText || '').length,
      });

      const aiRes = await fetch('/api/ai/extract-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: uploadData.extractedText || '',
          fileName: uploadData.pdfFileName,
        }),
      });

      const aiData = await aiRes.json().catch(() => ({}));

      console.log('=== REAL FLOW STEP 6 AI RESPONSE ===', {
        status: aiRes.status,
        success: aiData.success,
        keys: Object.keys(aiData),
      });

      if (!aiRes.ok) {
        throw new Error(aiData.error || 'Failed to run AI metadata extraction.');
      }

      // Canonical metadata extraction object
      const meta = aiData?.metadata ?? aiData?.response?.metadata ?? aiData?.data?.metadata ?? aiData ?? {};

      // Apply metadata to form state
      applyExtractedMetadataToForm(meta, uploadData.pdfFileName);

      // Advance to Admin Review step
      setCurrentStep(4);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during upload processing.');
      setCurrentStep(1);
    } finally {
      setLoading(false);
    }
  };

  // Inspect rendered DOM values after step 4 transition
  useEffect(() => {
    if (currentStep === 4) {
      const timer = setTimeout(() => {
        console.log('=== REAL FLOW STEP 9 DOM VALUES ===', {
          titleDOM: (document.querySelector('input[name="title"]') as HTMLInputElement)?.value,
          clientNameDOM: (document.querySelector('input[name="clientName"]') as HTMLInputElement)?.value,
          industryDOM: (document.querySelector('input[name="industry"]') as HTMLInputElement)?.value,
          projectTypeDOM: (document.querySelector('input[name="projectType"]') as HTMLInputElement)?.value,
          technologiesInputDOM: (document.querySelector('input[name="technologiesInput"]') as HTMLInputElement)?.value,
          servicesInputDOM: (document.querySelector('input[name="servicesInput"]') as HTMLInputElement)?.value,
          tagsInputDOM: (document.querySelector('input[name="tagsInput"]') as HTMLInputElement)?.value,
          businessOutcomesInputDOM: (document.querySelector('textarea[name="businessOutcomesInput"]') as HTMLTextAreaElement)?.value,
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentStep, title, clientName, industry, projectType, technologiesInput]);

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
      const business_outcomes = businessOutcomesInput
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        title,
        description,
        industry,
        sub_industry: subIndustry,
        project_type: projectType,
        geography,
        client_name: clientName,
        challenge,
        solution,
        technologies,
        services,
        tags,
        business_outcomes,
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
              <span>BS Upload & Extraction</span>
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
              <p className="text-xs text-gray-500 mt-1">Accepts standard PDF documents up to 100MB</p>

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
              {currentStep === 2 ? 'Uploading to BS Server & Extracting Text...' : 'Running AI Metadata Extraction...'}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Please wait while the server securely uploads the PDF to BS Server storage and parses text content into structured metadata.
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
                {textExtractionWarning && (
                  <p className="text-xs font-semibold text-amber-800 mt-2 bg-amber-100 p-2.5 rounded-lg border border-amber-200">
                    {textExtractionWarning}
                  </p>
                )}
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
                    name="title"
                    id="title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter case study title"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    name="clientName"
                    id="clientName"
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
                  name="description"
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter executive summary or overview"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Industry, Sub-Industry, Project Type, Geography */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Industry</span>
                  </label>
                  <input
                    type="text"
                    name="industry"
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. Software & Cloud Technology"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Sub-Industry
                  </label>
                  <input
                    type="text"
                    name="subIndustry"
                    id="subIndustry"
                    value={subIndustry}
                    onChange={(e) => setSubIndustry(e.target.value)}
                    placeholder="e.g. Cloud Infrastructure"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Project Type
                  </label>
                  <input
                    type="text"
                    name="projectType"
                    id="projectType"
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    placeholder="e.g. Enterprise Solution"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Geography
                  </label>
                  <input
                    type="text"
                    name="geography"
                    id="geography"
                    value={geography}
                    onChange={(e) => setGeography(e.target.value)}
                    placeholder="e.g. North America, Global"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Technologies & Services */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                    <Cpu className="w-3.5 h-3.5 text-blue-600" />
                    <span>Technologies (Comma Separated)</span>
                  </label>
                  <input
                    type="text"
                    name="technologiesInput"
                    id="technologiesInput"
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
                    name="servicesInput"
                    id="servicesInput"
                    value={servicesInput}
                    onChange={(e) => setServicesInput(e.target.value)}
                    placeholder="Cloud Migration, Analytics"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Tags & Business Outcomes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    <span>Tags (Comma Separated)</span>
                  </label>
                  <input
                    type="text"
                    name="tagsInput"
                    id="tagsInput"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Enterprise, High-Scale, Microservices"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Business Outcomes (One Per Line)</span>
                  </label>
                  <textarea
                    rows={3}
                    name="businessOutcomesInput"
                    id="businessOutcomesInput"
                    value={businessOutcomesInput}
                    onChange={(e) => setBusinessOutcomesInput(e.target.value)}
                    placeholder="Enter business outcomes (one per line)"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Challenge & Solution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Challenge Section
                  </label>
                  <textarea
                    rows={4}
                    name="challenge"
                    id="challenge"
                    value={challenge}
                    onChange={(e) => setChallenge(e.target.value)}
                    placeholder="Enter problem statement or key challenges"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Solution Section
                  </label>
                  <textarea
                    rows={4}
                    name="solution"
                    id="solution"
                    value={solution}
                    onChange={(e) => setSolution(e.target.value)}
                    placeholder="Enter implementation details or architecture"
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
                  name="featured"
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
                onClick={() => {
                  resetFormState();
                  setSelectedFile(null);
                  setCurrentStep(1);
                }}
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
