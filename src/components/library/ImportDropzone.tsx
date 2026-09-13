'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { GlassButton } from '@/components/common/GlassButton';

const CATEGORIES = [
  'General',
  'Computer Science',
  'Medicine & Health',
  'Mathematics',
  'Engineering',
  'Business & Economics',
  'Law & Humanities',
  'Natural Sciences',
];

interface ImportDropzoneProps {
  onImportSuccess: (doc: any) => void;
  onCancel?: () => void;
}

type UploadStage =
  | 'idle'
  | 'hashing'
  | 'ready_to_publish'
  | 'uploading'
  | 'processing'
  | 'done'
  | 'duplicate'
  | 'error';

export const ImportDropzone: React.FC<ImportDropzoneProps> = ({
  onImportSuccess,
  onCancel,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<UploadStage>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [duplicateDoc, setDuplicateDoc] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStage('idle');
    setSelectedFile(null);
    setFileHash(null);
    setDuplicateDoc(null);
    setTitle('');
    setCategory('General');
    setDescription('');
    setUploadProgress(0);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const calculateSha256 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Please select a valid PDF document.');
      setStage('error');
      return;
    }

    // 100MB limit check
    if (file.size > 100 * 1024 * 1024) {
      setErrorMessage('PDF exceeds the 100MB maximum upload limit.');
      setStage('error');
      return;
    }

    try {
      setErrorMessage(null);
      setSelectedFile(file);
      const cleanTitle = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
      setTitle(cleanTitle);
      setStage('hashing');

      // 1. Calculate SHA-256 hash locally in browser
      const hash = await calculateSha256(file);
      setFileHash(hash);

      // 2. Query duplicate check API
      const checkRes = await fetch('/api/documents/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_hash: hash }),
      });

      const checkData = await checkRes.json();

      if (checkData.success && checkData.isDuplicate) {
        setDuplicateDoc(checkData.document);
        setStage('duplicate');
        return;
      }

      // Ready for user to pick category and publish
      setStage('ready_to_publish');
    } catch (err: any) {
      console.error('File verification error:', err);
      setErrorMessage(err.message || 'Error processing PDF file.');
      setStage('error');
    }
  };

  const executeUpload = async (force = false) => {
    if (!selectedFile) return;

    setStage('uploading');
    setUploadProgress(0);
    setErrorMessage(null);

    // 1. Check if direct cloud upload is available (bypasses Vercel/proxy body limits)
    let uploadTicket: { directUpload: boolean; signedUrl?: string; documentId?: string } | null = null;
    try {
      const ticketRes = await fetch('/api/documents/upload-url', { method: 'POST' });
      if (ticketRes.ok) {
        uploadTicket = await ticketRes.json();
      }
    } catch {
      // Fall back to standard upload
    }

    if (!force && uploadTicket?.directUpload && uploadTicket.signedUrl && uploadTicket.documentId) {
      // Direct-to-Supabase Storage upload (bypasses serverless 4.5MB limitation)
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percent);
          if (percent >= 100) {
            setStage('processing');
          }
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            // Finalize registration in database
            const compRes = await fetch('/api/documents/complete-upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: uploadTicket.documentId,
                title: title.trim() || selectedFile.name.replace(/\.pdf$/i, ''),
                category,
                description: description.trim() || null,
                file_hash: fileHash,
                file_size: selectedFile.size,
                original_filename: selectedFile.name,
              }),
            });

            const compData = await compRes.json();
            if (compData.success && compData.document) {
              setStage('done');
              setTimeout(() => {
                onImportSuccess(compData.document);
                resetState();
              }, 1200);
            } else {
              setErrorMessage(compData.error || 'Failed to complete document registration');
              setStage('error');
            }
          } catch (err: any) {
            setErrorMessage(err.message || 'Error finalizing document');
            setStage('error');
          }
        } else {
          setErrorMessage(`Cloud storage upload failed (HTTP ${xhr.status})`);
          setStage('error');
        }
      });

      xhr.addEventListener('error', () => {
        setErrorMessage('Network error during cloud storage upload.');
        setStage('error');
      });

      xhr.open('PUT', uploadTicket.signedUrl);
      xhr.setRequestHeader('Content-Type', 'application/pdf');
      xhr.send(selectedFile);
      return;
    }

    // 2. Standard proxy upload fallback (for local development or if direct upload is off)
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', title.trim() || selectedFile.name.replace(/\.pdf$/i, ''));
    formData.append('category', category);
    if (description.trim()) {
      formData.append('description', description.trim());
    }
    if (force) {
      formData.append('force', 'true');
    }

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(percent);
        if (percent >= 100) {
          setStage('processing');
        }
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success && res.document) {
            setStage('done');
            setTimeout(() => {
              onImportSuccess(res.document);
              resetState();
            }, 1200);
          } else {
            setErrorMessage(res.error || 'Upload failed');
            setStage('error');
          }
        } catch {
          setErrorMessage('Invalid server response format');
          setStage('error');
        }
      } else {
        if (xhr.status === 413 || xhr.responseText?.includes('Request Entity Too Large')) {
          setErrorMessage('File exceeds the proxy upload size limit. Please upload a smaller PDF or configure Supabase Storage for direct large file uploads.');
        } else {
          try {
            const res = JSON.parse(xhr.responseText);
            setErrorMessage(res.error || `Server responded with status ${xhr.status}`);
          } catch {
            setErrorMessage(`Upload failed with status ${xhr.status}: ${xhr.statusText || 'Server Error'}`);
          }
        }
        setStage('error');
      }
    });

    xhr.addEventListener('error', () => {
      setErrorMessage('Network error occurred during upload.');
      setStage('error');
    });

    xhr.open('POST', '/api/documents');
    xhr.send(formData);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
          }
        }}
        accept="application/pdf"
        className="hidden"
      />

      {/* 1. Idle state / Drag & Drop Target */}
      {stage === 'idle' && (
        <GlassCard
          variant="card"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-8 border-dashed border-2 cursor-pointer transition-all duration-200 text-center relative overflow-hidden ${
            isDragging
              ? 'border-neutral-900 dark:border-white bg-black/5 dark:bg-white/10 scale-[0.99]'
              : 'border-black/10 dark:border-white/15 hover:border-black/25 dark:hover:border-white/25 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-neutral-700 dark:text-neutral-200">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                Import PDF to Community Library
              </p>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Drag & drop your study PDF here, or click to browse. Files are stored permanently in Supabase Cloud Storage.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-neutral-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                SHA-256 Verified
              </span>
              <span>•</span>
              <span>Max 100MB</span>
              <span>•</span>
              <span>Open Community Access</span>
            </div>
          </div>
        </GlassCard>
      )}

      {/* 2. Hashing / Integrity Check */}
      {stage === 'hashing' && (
        <GlassCard variant="card" className="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center mx-auto text-neutral-700 dark:text-neutral-200">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              Checking Document Fingerprint...
            </p>
            <p className="text-xs text-neutral-400">
              Computing SHA-256 checksum and checking for duplicates in the community library.
            </p>
          </div>
        </GlassCard>
      )}

      {/* 3. Duplicate Found State */}
      {stage === 'duplicate' && duplicateDoc && (
        <GlassCard variant="surface" className="p-6 border border-amber-500/30 bg-amber-500/5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
                Duplicate PDF Detected
              </span>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                {duplicateDoc.title}
              </h4>
              <p className="text-xs text-neutral-500">
                This exact file has already been uploaded by {duplicateDoc.uploaded_by || 'a community member'}{' '}
                under category <strong className="text-neutral-700 dark:text-neutral-300">{duplicateDoc.category || 'General'}</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={`/reader/${duplicateDoc.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 hover:opacity-90 transition-opacity"
            >
              <span>Open Existing PDF</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={() => executeUpload(true)}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors"
            >
              Upload as New Copy Anyway
            </button>

            <button
              onClick={resetState}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-neutral-700 dark:text-neutral-300"
            >
              Choose Different File
            </button>
          </div>
        </GlassCard>
      )}

      {/* 4. Ready to Publish / Category & Metadata Form */}
      {stage === 'ready_to_publish' && selectedFile && (
        <GlassCard variant="card" className="p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-neutral-700 dark:text-neutral-200" />
              <div>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Publish to Community Library
                </h4>
                <p className="text-[11px] font-mono text-neutral-400">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {fileHash?.substring(0, 12)}...
                </p>
              </div>
            </div>

            <button
              onClick={resetState}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Document Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter study document title"
                className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/5 text-neutral-900 dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs transition-all ${
                      category === cat
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-medium shadow-sm'
                        : 'bg-black/5 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Description <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Brief summary or context for fellow students..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/5 text-neutral-900 dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-black/5 dark:border-white/10">
            <button
              onClick={resetState}
              className="px-4 py-2 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <GlassButton variant="primary" size="sm" onClick={() => executeUpload(false)}>
              <span>Upload to Community</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* 5. Uploading & Processing States */}
      {(stage === 'uploading' || stage === 'processing') && (
        <GlassCard variant="card" className="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center mx-auto text-neutral-700 dark:text-neutral-200">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              {stage === 'uploading' ? `Uploading PDF... ${uploadProgress}%` : 'Processing PDF...'}
            </p>
            <p className="text-xs text-neutral-400">
              {stage === 'uploading'
                ? 'Streaming binary payload directly to Supabase Storage'
                : 'Extracting text pages & registering community database entry'}
            </p>
          </div>

          {/* Real progress bar */}
          <div className="w-full max-w-xs mx-auto h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full bg-neutral-900 dark:bg-white rounded-full transition-all duration-200 ${
                stage === 'processing' ? 'animate-pulse' : ''
              }`}
              style={{ width: `${stage === 'processing' ? 100 : uploadProgress}%` }}
            />
          </div>
        </GlassCard>
      )}

      {/* 6. Done State */}
      {stage === 'done' && (
        <GlassCard variant="surface" className="p-8 text-center space-y-3 border border-emerald-500/30 bg-emerald-500/5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-neutral-900 dark:text-white">
              ✓ Added to Community Library
            </p>
            <p className="text-xs text-neutral-400">
              Your document is now securely stored in Supabase and available to all community members.
            </p>
          </div>
        </GlassCard>
      )}

      {/* 7. Error State */}
      {stage === 'error' && (
        <GlassCard variant="surface" className="p-6 text-center space-y-4 border border-red-500/30 bg-red-500/5">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              Upload Failed
            </p>
            <p className="text-xs text-neutral-500">
              {errorMessage || 'An error occurred while uploading your document.'}
            </p>
          </div>
          <button
            onClick={resetState}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </GlassCard>
      )}
    </div>
  );
};
