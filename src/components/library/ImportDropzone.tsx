'use client';

import React, { useState, useRef } from 'react';
import { Plus, UploadCloud, FileText, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';

interface ImportDropzoneProps {
  onImportSuccess: (doc: any) => void;
}

export const ImportDropzone: React.FC<ImportDropzoneProps> = ({ onImportSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Please upload a valid PDF document.');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.replace(/\.pdf$/i, ''));

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to upload PDF');
      }

      onImportSuccess(data.document);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error uploading PDF.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
          }
        }}
        accept="application/pdf"
        className="hidden"
      />

      <GlassCard
        variant="card"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-6 border-dashed border-2 cursor-pointer transition-all duration-200 text-center ${
          isDragging
            ? 'border-neutral-900 dark:border-white bg-black/5 dark:bg-white/10'
            : 'border-black/10 dark:border-white/15 hover:border-black/25 dark:hover:border-white/25'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          {uploading ? (
            <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-neutral-700 dark:text-neutral-200">
              <UploadCloud className="w-5 h-5" />
            </div>
          )}

          <div className="space-y-0.5">
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              {uploading ? 'Processing & indexing PDF...' : 'Import new PDF document'}
            </p>
            <p className="text-xs text-neutral-400">
              Drag & drop here, or click to browse files from your computer
            </p>
          </div>

          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      </GlassCard>
    </div>
  );
};
