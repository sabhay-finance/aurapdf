'use client';

import React, { useState, useEffect } from 'react';
import { X, Moon, Sun, Monitor, Key, Sparkles, Sliders, Database, Download, User } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { useSession } from 'next-auth/react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { data: session } = useSession();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [explanationLevel, setExplanationLevel] = useState<'simple' | 'standard' | 'exam' | 'detailed'>('standard');
  const [provider, setProvider] = useState<'local' | 'gemini' | 'openai'>('local');
  const [apiKey, setApiKey] = useState('');
  const [pageLayout, setPageLayout] = useState<'two-page' | 'single-page'>('two-page');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('aura_theme') || 'dark';
      const storedLevel = (localStorage.getItem('aura_explanation_level') as any) || 'standard';
      const storedProvider = (localStorage.getItem('aura_ai_provider') as any) || 'local';
      const storedKey = localStorage.getItem('aura_api_key') || '';
      const storedLayout = (localStorage.getItem('aura_page_layout') as any) || 'two-page';

      setTheme(storedTheme as any);
      setExplanationLevel(storedLevel);
      setProvider(storedProvider);
      setApiKey(storedKey);
      setPageLayout(storedLayout);

      if (storedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('aura_theme', theme);
    localStorage.setItem('aura_explanation_level', explanationLevel);
    localStorage.setItem('aura_ai_provider', provider);
    localStorage.setItem('aura_api_key', apiKey);
    localStorage.setItem('aura_page_layout', pageLayout);

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    onClose();
  };

  const handleExportFlashcards = async () => {
    try {
      const res = await fetch('/api/flashcards');
      const data = await res.json();
      if (data.flashcards) {
        const csvContent =
          'data:text/csv;charset=utf-8,' +
          'Question,Answer,Source Page,Tags\n' +
          data.flashcards
            .map(
              (f: any) =>
                `"${f.question.replace(/"/g, '""')}","${f.answer.replace(/"/g, '""')}",${f.source_page},"${f.tags || ''}"`
            )
            .join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'aura_flashcards_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div
        className="w-full max-w-lg p-6 rounded-2xl shadow-2xl border border-black/15 dark:border-white/20 bg-white dark:bg-[#121214] text-neutral-900 dark:text-white space-y-6"
      >
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-neutral-500" />
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
              Settings & Preferences
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Appearance */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Appearance
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                  theme === 'light'
                    ? 'border-black dark:border-white bg-black/5 dark:bg-white/10 text-neutral-900 dark:text-white'
                    : 'border-black/10 dark:border-white/10 text-neutral-500'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                  theme === 'dark'
                    ? 'border-black dark:border-white bg-black/5 dark:bg-white/10 text-neutral-900 dark:text-white'
                    : 'border-black/10 dark:border-white/10 text-neutral-500'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Dark (Monochrome)</span>
              </button>
            </div>
          </div>

          {/* Reading Preferences */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Default PDF Layout
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPageLayout('two-page')}
                className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                  pageLayout === 'two-page'
                    ? 'border-black dark:border-white bg-black/5 dark:bg-white/10 text-neutral-900 dark:text-white'
                    : 'border-black/10 dark:border-white/10 text-neutral-500'
                }`}
              >
                Two-Page Spread (Desktop/iPad)
              </button>
              <button
                type="button"
                onClick={() => setPageLayout('single-page')}
                className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                  pageLayout === 'single-page'
                    ? 'border-black dark:border-white bg-black/5 dark:bg-white/10 text-neutral-900 dark:text-white'
                    : 'border-black/10 dark:border-white/10 text-neutral-500'
                }`}
              >
                Single-Page View
              </button>
            </div>
          </div>

          {/* AI Settings */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Tutor Engine</span>
            </label>
            <div className="space-y-2">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-black/10 dark:border-white/15 bg-white/50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white outline-none"
              >
                <option value="local">Local PDF Engine (Grounded Heuristics, No API Key needed)</option>
                <option value="gemini">Google Gemini 2.0 (High intelligence, requires Key)</option>
                <option value="openai">OpenAI GPT-4o / Compatible (Requires Key)</option>
              </select>

              {provider !== 'local' && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <Key className="w-3 h-3" />
                    <span>API Key (Stored locally in browser, never logged):</span>
                  </div>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter API key..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-black/10 dark:border-white/15 bg-white/50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white outline-none"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-400">Explanation Depth:</label>
              <div className="grid grid-cols-4 gap-1">
                {(['simple', 'standard', 'exam', 'detailed'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setExplanationLevel(level)}
                    className={`py-1.5 text-xs capitalize rounded-lg border transition-all ${
                      explanationLevel === level
                        ? 'border-black dark:border-white bg-black/10 dark:bg-white/15 font-semibold text-neutral-900 dark:text-white'
                        : 'border-black/5 dark:border-white/10 text-neutral-400'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Account & Security */}
          <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/10">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Account & Security</span>
            </label>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3 min-w-0">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-9 h-9 rounded-full object-cover border border-black/10 dark:border-white/20"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-sm font-semibold text-neutral-700 dark:text-neutral-300 shrink-0">
                    {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {session?.user?.name || 'Student'}
                  </div>
                  <div className="text-xs text-neutral-400 truncate">
                    {session?.user?.email || 'Authenticated Account'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Open Access</span>
              </div>
            </div>
          </div>

          {/* Export & Data */}
          <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/10">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              <span>Export Study Data</span>
            </label>
            <div className="flex gap-2">
              <GlassButton size="sm" onClick={handleExportFlashcards} className="text-xs">
                <Download className="w-3.5 h-3.5" />
                <span>Export Flashcards (CSV/Anki)</span>
              </GlassButton>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5 dark:border-white/10">
          <GlassButton variant="ghost" onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton variant="primary" onClick={handleSave}>
            Save Preferences
          </GlassButton>
        </div>
      </div>
    </div>
  );
};
