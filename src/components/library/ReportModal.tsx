'use client';

import React, { useState } from 'react';
import { GlassCard } from '@/components/common/GlassCard';
import { GlassButton } from '@/components/common/GlassButton';
import { Flag, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  documentId: string;
  documentTitle: string;
  onClose: () => void;
}

const REPORT_REASONS = [
  'Broken, empty, or unreadable PDF',
  'Inappropriate or harmful content',
  'Copyright or intellectual property violation',
  'Wrong category or misleading title',
  'Spam or duplicate upload',
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  documentId,
  documentTitle,
  onClose,
}) => {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/documents/${documentId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: details ? `${reason}: ${details}` : reason,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1600);
    } catch (err: any) {
      setError(err.message || 'Error submitting report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <GlassCard variant="surface" className="p-6 space-y-4 shadow-2xl border border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                <Flag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Report Community Document
                </h3>
                <p className="text-[11px] text-neutral-400 truncate max-w-[260px]">
                  {documentTitle}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {success ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                Report Submitted
              </p>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                Thank you. Our community moderation team will review this document promptly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Reason for reporting
                </label>
                <div className="space-y-1.5">
                  {REPORT_REASONS.map((r) => (
                    <label
                      key={r}
                      className="flex items-center gap-2 p-2 rounded-xl border border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-xs text-neutral-800 dark:text-neutral-200 transition-colors"
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        value={r}
                        checked={reason === r}
                        onChange={(e) => setReason(e.target.value)}
                        className="text-neutral-900 dark:text-white focus:ring-0"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Additional Details <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={2}
                  placeholder="Explain any relevant issues or specifics..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/5 text-neutral-900 dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 resize-none"
                />
              </div>

              {error && (
                <div className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <GlassButton
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Report</span>
                  )}
                </GlassButton>
              </div>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
