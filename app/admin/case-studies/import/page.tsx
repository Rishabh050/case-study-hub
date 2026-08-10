'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileText,
  Play,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Eye,
  Trash2,
  ArrowLeft,
  CheckSquare,
  ShieldAlert,
} from 'lucide-react';
import { BulkImportItem, AIMetadataExtractionResult } from '@/lib/types/case-study';
import { Modal } from '@/components/ui/Modal';

export default function BulkImportPage() {
  const [queue, setQueue] = useState<BulkImportItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeReviewItem, setActiveReviewItem] = useState<BulkImportItem | null>(null);

  // Add multiple PDFs to queue
  const handleFilesSelect = (files: FileList | null) => {
    if (!files) return;
    const newItems: BulkImportItem[] = [];

    Array.from(files).forEach((file, index) => {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        newItems.push({
          id: `bulk-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          fileName: file.name,
          fileSize: file.size,
          status: 'pending',
        });
      }
    });

    setQueue((prev) => [...prev, ...newItems]);
  };

  const removeFromQueue = (id: string) => {
    setQueue(queue.filter((item) => item.id !== id));
  };

  const clearCompleted = () => {
    setQueue(queue.filter((item) => item.status !== 'completed'));
  };

  // Run Real Bulk AI Extraction Pipeline via Server API Routes
  const runBatchProcessing = async () => {
    setIsProcessing(true);

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === 'completed' || item.status === 'saving' || item.status === 'review') continue;

      // Update status to uploading & extracting
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'extracting' } : q))
      );

      try {
        let textToAnalyze = item.extractedText || '';
        let storageKey = item.storageKey || '';

        // Step A: Upload PDF & Extract Text via Server API if file object is present
        if (item.file && (!textToAnalyze || !storageKey)) {
          const formData = new FormData();
          formData.append('file', item.file);

          const uploadRes = await fetch('/api/upload/pdf', {
            method: 'POST',
            body: formData,
          });

          if (!uploadRes.ok) {
            const errJson = await uploadRes.json();
            throw new Error(errJson.error || 'Failed to upload PDF and extract text');
          }

          const uploadData = await uploadRes.json();
          textToAnalyze = uploadData.extractedText || '';
          storageKey = uploadData.storageKey || '';
        }

        // Step B: Send extracted text to AI metadata extractor endpoint
        const aiRes = await fetch('/api/ai/extract-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToAnalyze,
            fileName: item.fileName,
          }),
        });

        if (!aiRes.ok) {
          const errJson = await aiRes.json();
          throw new Error(errJson.error || 'AI metadata extraction failed');
        }

        const aiData = await aiRes.json();

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: 'review',
                  extractedText: textToAnalyze,
                  storageKey,
                  generatedMetadata: aiData.metadata,
                }
              : q
          )
        );
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'error', error: err.message } : q
          )
        );
      }
    }

    setIsProcessing(false);
  };

  // Batch Save all reviewed items as Drafts to Supabase
  const batchSaveAsDrafts = async () => {
    setIsProcessing(true);

    for (const item of queue) {
      if (item.status === 'review' && item.generatedMetadata) {
        try {
          const meta = item.generatedMetadata;
          const payload = {
            title: meta.title || item.fileName.replace(/\.pdf$/i, ''),
            description: meta.description,
            industry: meta.industry,
            client_name: meta.client_name,
            challenge: meta.challenge,
            solution: meta.solution,
            technologies: meta.technologies,
            services: meta.services,
            tags: meta.tags,
            key_results: meta.key_results,
            pdf_file_name: item.fileName,
            pdf_storage_key: item.storageKey || `case-studies/bulk-${item.fileName}`,
            status: 'draft',
          };

          const res = await fetch('/api/case-studies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            setQueue((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, status: 'completed' } : q))
            );
          }
        } catch (err) {
          console.error(`Error saving bulk item ${item.fileName}:`, err);
        }
      }
    }

    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center space-x-1 text-xs font-semibold text-gray-500 hover:text-blue-600 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Admin Dashboard</span>
            </Link>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                Bulk Workflow Pipeline
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Bulk Import Case Study PDFs
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Batch processing pipeline designed to ingest multiple PDFs (e.g. your 61 case study files), run server-side text extraction & AI metadata generation, and review prior to publishing.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {queue.length > 0 && (
              <>
                <button
                  onClick={runBatchProcessing}
                  disabled={isProcessing}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{isProcessing ? 'Processing Queue...' : 'Run AI Batch Extraction'}</span>
                </button>

                <button
                  onClick={batchSaveAsDrafts}
                  disabled={isProcessing || !queue.some((q) => q.status === 'review')}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Save Batch as Drafts</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Phase 1 Readiness Notice Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3 text-blue-900 text-sm">
          <ShieldAlert className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Phase 1 Architecture Readiness Notice</p>
            <p className="text-xs text-blue-800 mt-0.5 leading-relaxed">
              The bulk import pipeline architecture is connected directly to server storage and AI extraction endpoints. Select your PDF files simultaneously to execute automated text extraction, AI metadata generation, and batch database creation.
            </p>
          </div>
        </div>

        {/* Dropzone for Multiple PDFs */}
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 hover:border-gray-400 p-8 text-center bg-gray-50/50 space-y-3">
          <UploadCloud className="w-10 h-10 text-blue-600 mx-auto" />
          <h3 className="text-base font-bold text-gray-900">
            Select Batch of PDF Files for Processing
          </h3>
          <p className="text-xs text-gray-500">
            Select multiple PDF files simultaneously. All files will be queued for automated server processing.
          </p>

          <div>
            <label className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer shadow-sm">
              <span>Select Multiple PDFs</span>
              <input
                type="file"
                multiple
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => handleFilesSelect(e.target.files)}
              />
            </label>
          </div>
        </div>

        {/* Batch Queue Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">
              Bulk Import Queue ({queue.length} items)
            </h3>
            {queue.some((q) => q.status === 'completed') && (
              <button
                onClick={clearCompleted}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900"
              >
                Clear Completed
              </button>
            )}
          </div>

          {queue.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {queue.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="truncate">
                      <p className="text-sm font-bold text-gray-900 truncate">{item.fileName}</p>
                      <p className="text-xs text-gray-400">
                        {(item.fileSize / (1024 * 1024)).toFixed(2)} MB
                        {item.storageKey && ` • Storage Key: ${item.storageKey.slice(0, 24)}...`}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center space-x-4">
                    <span
                      className={`inline-flex items-center space-x-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                        item.status === 'pending'
                          ? 'bg-gray-100 text-gray-700'
                          : item.status === 'extracting'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : item.status === 'review'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : item.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {item.status === 'extracting' && <RefreshCw className="w-3 h-3 animate-spin" />}
                      {item.status === 'review' && <Sparkles className="w-3 h-3 text-amber-500" />}
                      {item.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                      <span className="capitalize">{item.status}</span>
                    </span>

                    {/* Metadata Preview Trigger */}
                    {item.generatedMetadata && (
                      <button
                        onClick={() => setActiveReviewItem(item)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Preview AI Extracted Metadata"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => removeFromQueue(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-gray-500">
              No files currently queued for bulk import. Click "Select Multiple PDFs" above to queue files.
            </div>
          )}
        </div>
      </main>

      {/* Metadata Review Modal */}
      <Modal
        isOpen={Boolean(activeReviewItem)}
        onClose={() => setActiveReviewItem(null)}
        onConfirm={() => setActiveReviewItem(null)}
        title={`AI Extracted Metadata Preview: ${activeReviewItem?.fileName}`}
        description="Review generated structured metadata extracted for this bulk PDF."
        confirmText="Done Reviewing"
      >
        {activeReviewItem?.generatedMetadata && (
          <div className="space-y-3 text-xs text-gray-700 text-left max-h-96 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200 font-mono">
            <div>
              <span className="font-bold text-gray-900">Title:</span> {activeReviewItem.generatedMetadata.title}
            </div>
            <div>
              <span className="font-bold text-gray-900">Industry:</span> {activeReviewItem.generatedMetadata.industry || 'N/A'}
            </div>
            <div>
              <span className="font-bold text-gray-900">Technologies:</span> {activeReviewItem.generatedMetadata.technologies.join(', ') || 'None'}
            </div>
            <div>
              <span className="font-bold text-gray-900">Services:</span> {activeReviewItem.generatedMetadata.services.join(', ') || 'None'}
            </div>
            <div>
              <span className="font-bold text-gray-900">Description:</span> {activeReviewItem.generatedMetadata.description}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
