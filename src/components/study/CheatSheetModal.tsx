'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Copy,
  Check,
  X,
  Sparkles,
  AlertTriangle,
  Scale,
  BookOpen,
  Loader2,
  Download,
} from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';

interface CheatSheetData {
  title: string;
  formulas: Array<{
    name: string;
    equation: string;
    description: string;
    examTip?: string;
  }>;
  decisionRules: Array<{
    title: string;
    condition: string;
    decision: string;
    trap?: string;
  }>;
  traps: Array<{
    topic: string;
    pitfall: string;
    correct: string;
  }>;
  definitions: Array<{
    term: string;
    definition: string;
  }>;
}

interface CheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  currentPage?: number;
}

export const CheatSheetModal: React.FC<CheatSheetModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  currentPage = 1,
}) => {
  const [data, setData] = useState<CheatSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCheatSheet();
    }
  }, [isOpen, documentId]);

  const loadCheatSheet = async () => {
    setLoading(true);
    try {
      const apiKey = typeof window !== 'undefined' ? localStorage.getItem('aura_api_key') || undefined : undefined;
      const provider = typeof window !== 'undefined' ? localStorage.getItem('aura_ai_provider') || undefined : undefined;

      const res = await fetch('/api/ai/cheat-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          page_number: currentPage,
          apiKey,
          provider,
        }),
      });

      const resData = await res.json();
      if (resData.success && resData.cheatSheet) {
        setData(resData.cheatSheet);
      }
    } catch (err) {
      console.error('Failed to load cheat sheet:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyMarkdown = () => {
    if (!data) return;
    let md = `# ${data.title}\n\n`;
    md += `## 📐 Core Formulas\n`;
    data.formulas.forEach((f) => {
      md += `### ${f.name}\n- **Equation:** \`${f.equation}\`\n- ${f.description}\n- *Exam Tip:* ${f.examTip || ''}\n\n`;
    });
    md += `## ⚙️ Decision Rules\n`;
    data.decisionRules.forEach((r) => {
      md += `### ${r.title}\n- **Condition:** ${r.condition}\n- **Rule:** ${r.decision}\n- **Trap:** ${r.trap || ''}\n\n`;
    });
    md += `## ⚠️ Exam Traps\n`;
    data.traps.forEach((t) => {
      md += `- **${t.topic}:** ${t.pitfall} → *Correction:* ${t.correct}\n`;
    });

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-[#121214] border border-black/15 dark:border-white/15 shadow-2xl text-neutral-900 dark:text-white overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-6 pb-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between gap-4 shrink-0 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">
                Exam Revision Cheat Sheet
              </h2>
              <span className="text-xs text-neutral-500 block truncate max-w-sm">
                {documentTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              disabled={loading || !data}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#18181C] text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-40"
              title="Copy as Markdown"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={loading || !data}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs print:p-0 print:overflow-visible">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <p className="text-xs font-medium">Synthesizing formulas, decision rules & exam traps...</p>
            </div>
          ) : !data ? (
            <div className="py-20 text-center text-neutral-400">
              Unable to compile cheat sheet at this time.
            </div>
          ) : (
            <div className="space-y-6 print:space-y-4">
              {/* Section 1: Formulas Matrix */}
              {data.formulas && data.formulas.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px] text-amber-600 dark:text-amber-400">
                    <span>📐 Core Formulas & Mechanics</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.formulas.map((f, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-2xl border border-black/10 dark:border-white/15 bg-neutral-50/70 dark:bg-[#18181C] space-y-1.5 shadow-xs"
                      >
                        <span className="font-semibold text-neutral-900 dark:text-white block text-xs">
                          {f.name}
                        </span>
                        <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 font-mono text-[11px] text-amber-600 dark:text-amber-400 select-all">
                          {f.equation}
                        </div>
                        <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                          {f.description}
                        </p>
                        {f.examTip && (
                          <div className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-500/10 p-1.5 rounded-lg">
                            <span className="font-semibold">Exam Tip: </span>
                            {f.examTip}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: Decision Rules */}
              {data.decisionRules && data.decisionRules.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px] text-emerald-600 dark:text-emerald-400">
                    <span>⚙️ Decision Rules & Conditions</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.decisionRules.map((r, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-2xl border border-black/10 dark:border-white/15 bg-neutral-50/70 dark:bg-[#18181C] space-y-2 shadow-xs"
                      >
                        <span className="font-semibold text-neutral-900 dark:text-white block">
                          {r.title}
                        </span>
                        <div className="text-[11px] space-y-1">
                          <p className="text-neutral-500 dark:text-neutral-400">
                            <strong className="text-neutral-800 dark:text-neutral-200">Condition:</strong> {r.condition}
                          </p>
                          <p className="text-emerald-700 dark:text-emerald-300">
                            <strong className="text-neutral-800 dark:text-neutral-200">Action:</strong> {r.decision}
                          </p>
                          {r.trap && (
                            <p className="text-red-600 dark:text-red-400 text-[10px] italic">
                              <strong>Trap:</strong> {r.trap}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 3: Exam Traps & Pitfalls */}
              {data.traps && data.traps.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px] text-red-600 dark:text-red-400">
                    <span>⚠️ Common Exam Traps & Mistakes</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {data.traps.map((t, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-2xl border border-red-500/20 bg-red-500/5 dark:bg-red-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-neutral-900 dark:text-white block">
                            {t.topic}
                          </span>
                          <p className="text-red-700 dark:text-red-300 text-[11px]">
                            ❌ <strong>Trap:</strong> {t.pitfall}
                          </p>
                        </div>
                        <div className="p-2 rounded-xl bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 text-emerald-700 dark:text-emerald-300 text-[11px] shrink-0 sm:max-w-xs">
                          ✅ <strong>Correct:</strong> {t.correct}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 4: Key Definitions */}
              {data.definitions && data.definitions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px] text-neutral-500">
                    <span>🔑 Key Terminology & Definitions</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {data.definitions.map((d, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl border border-black/5 dark:border-white/10 bg-neutral-50 dark:bg-[#18181C]"
                      >
                        <strong className="text-neutral-900 dark:text-white block font-semibold mb-0.5">
                          {d.term}
                        </strong>
                        <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed">
                          {d.definition}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
