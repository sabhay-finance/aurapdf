'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  BookOpen,
  HelpCircle,
  FileQuestion,
  Layers,
  ArrowRight,
  Loader2,
  Settings,
  Cpu,
  Zap,
} from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { Citation } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  suggestedFollowups?: string[];
  provider?: string;
}

interface AISidebarProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  currentPage: number;
  isTwoPage?: boolean;
  selectedText?: string;
  onNavigateToPage: (page: number) => void;
  initialQuery?: string;
  onOpenSettings?: () => void;
}

/**
 * Lightweight Rich Markdown Formatter for AI study responses
 */
const FormattedMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');

  return (
    <div className="space-y-2 text-xs leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1.5" />;

        // H3 Header: ### Title
        if (trimmed.startsWith('### ')) {
          return (
            <h4
              key={idx}
              className="text-sm font-bold text-neutral-900 dark:text-white pt-1.5 pb-0.5 border-b border-black/5 dark:border-white/10"
            >
              {renderInlineStyles(trimmed.slice(4))}
            </h4>
          );
        }

        // H4 Header: #### Title
        if (trimmed.startsWith('#### ')) {
          return (
            <h5
              key={idx}
              className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 pt-1 text-amber-600 dark:text-amber-400"
            >
              {renderInlineStyles(trimmed.slice(5))}
            </h5>
          );
        }

        // Blockquote / Callout: > text
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={idx}
              className="border-l-2 border-amber-500 pl-2.5 py-0.5 my-1 text-neutral-600 dark:text-neutral-300 italic bg-amber-500/5 rounded-r"
            >
              {renderInlineStyles(trimmed.slice(2))}
            </blockquote>
          );
        }

        // Bullet point: • or - or *
        if (/^[\u2022\-\*]\s+/.test(trimmed)) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1.5 my-0.5">
              <span className="text-amber-500 font-bold shrink-0 mt-0.5">•</span>
              <span className="text-neutral-700 dark:text-neutral-200">
                {renderInlineStyles(trimmed.replace(/^[\u2022\-\*]\s+/, ''))}
              </span>
            </div>
          );
        }

        // Numbered list item: 1. text
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1.5 my-0.5">
              <span className="text-neutral-400 font-mono text-[11px] shrink-0">{numMatch[1]}.</span>
              <span className="text-neutral-700 dark:text-neutral-200">{renderInlineStyles(numMatch[2])}</span>
            </div>
          );
        }

        // Code block or formulation
        if (trimmed.startsWith('```') || trimmed.endsWith('```')) {
          return null; // Handled inline
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-neutral-700 dark:text-neutral-200">
            {renderInlineStyles(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

function renderInlineStyles(text: string): React.ReactNode {
  // Regex to parse **bold**, *italic*, and `code`
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-neutral-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="italic text-neutral-600 dark:text-neutral-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-[11px] text-amber-600 dark:text-amber-400"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export const AISidebar: React.FC<AISidebarProps> = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  currentPage,
  isTwoPage = false,
  selectedText,
  onNavigateToPage,
  initialQuery,
  onOpenSettings,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `### 🎓 Welcome to AuraPDF AI Study Tutor\n\nI am grounded directly in **${documentTitle}**. Every answer cites exact textbook page numbers.\n\nClick any quick prompt below or ask about any concept on **Page ${currentPage}${isTwoPage ? ` - ${currentPage + 1}` : ''}**.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeProviderName, setActiveProviderName] = useState<string>('Local Study Engine');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('aura_api_key');
      const storedProv = localStorage.getItem('aura_ai_provider');
      if (storedKey && storedProv === 'gemini') {
        setActiveProviderName('Google Gemini 2.0');
      } else if (storedKey && storedProv === 'openai') {
        setActiveProviderName('OpenAI GPT-4o');
      } else {
        setActiveProviderName('Local Study Engine (Grounded)');
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialQuery) {
      handleSend(initialQuery);
    }
  }, [initialQuery]);

  if (!isOpen) return null;

  const handleSend = async (queryToSend?: string) => {
    const query = queryToSend || input;
    if (!query.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!queryToSend) setInput('');
    setLoading(true);

    try {
      const apiKey = localStorage.getItem('aura_api_key') || undefined;
      const provider = localStorage.getItem('aura_ai_provider') || 'local';
      const explanationLevel = localStorage.getItem('aura_explanation_level') || 'standard';

      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          query,
          current_page: currentPage,
          selected_text: selectedText,
          explanation_level: explanationLevel,
          apiKey,
          provider,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to query AI tutor');
      }

      if (data.provider) {
        setActiveProviderName(data.provider);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
        suggestedFollowups: data.suggested_followups,
        provider: data.provider,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `### ⚠️ Tutor Notice\n\n${err.message || 'Unable to generate an answer at this time.'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const pagePromptLabel = isTwoPage
    ? `Explain Pages ${currentPage}-${currentPage + 1}`
    : `Explain Page ${currentPage}`;

  const suggestedChips = [
    pagePromptLabel,
    'Summarize this section',
    'Find key decision rules & formulas',
    'Test me with an exam question',
    'Create flashcards for this concept',
  ];

  return (
    <aside className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-96 md:w-[440px] p-3 sm:p-4 flex flex-col pointer-events-auto animate-in slide-in-from-right duration-200">
      <div className="h-full flex flex-col p-5 rounded-2xl shadow-2xl border border-black/15 dark:border-white/15 bg-white dark:bg-[#121214] text-neutral-900 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-950 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Contextual AI Tutor
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                  {activeProviderName.includes('Gemini') ? 'Gemini 2.0' : 'Grounded'}
                </span>
              </div>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block font-mono">
                Viewing: Page {currentPage}
                {isTwoPage ? ` & ${currentPage + 1}` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                title="AI Settings & API Keys"
                className="p-1.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Suggested Quick Chips */}
        <div className="py-2.5 overflow-x-auto flex gap-1.5 no-scrollbar shrink-0 border-b border-black/5 dark:border-white/10">
          {suggestedChips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 border border-black/5 dark:border-white/15 transition-all font-medium cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Selected text indicator if active */}
        {selectedText && (
          <div className="my-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200">
            <span className="font-semibold text-amber-600 dark:text-amber-400 block text-[10px] uppercase tracking-wider">
              Selected text context:
            </span>
            <p className="line-clamp-2 italic">&quot;{selectedText}&quot;</p>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 text-xs">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`p-4 rounded-2xl max-w-[92%] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-medium shadow-xs'
                    : 'bg-neutral-50 dark:bg-[#18181C] border border-black/8 dark:border-white/12 text-neutral-800 dark:text-neutral-100 shadow-sm'
                }`}
              >
                {msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <FormattedMarkdown content={msg.content} />
                )}

                {/* Grounded Source Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3.5 pt-2.5 border-t border-black/10 dark:border-white/10 space-y-1.5">
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 dark:text-neutral-400 block">
                      Grounded Citations:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((cite, idx) => (
                        <button
                          key={idx}
                          onClick={() => onNavigateToPage(cite.page_number)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-[11px] font-mono font-medium text-neutral-800 dark:text-neutral-100 border border-black/5 dark:border-white/15 transition-all cursor-pointer"
                          title="Click to jump directly to this page"
                        >
                          <BookOpen className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
                          <span>Page {cite.page_number}</span>
                          <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested follow-ups */}
                {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 space-y-1.5">
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 block">
                      Suggested Follow-ups:
                    </span>
                    {msg.suggestedFollowups.map((f, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(f)}
                        className="block w-full text-left text-[11px] text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        → {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 p-3 text-neutral-600 dark:text-neutral-300 text-xs animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-neutral-900 dark:text-white" />
              <span>Analyzing document context and synthesizing grounded study guide...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="pt-3 border-t border-black/5 dark:border-white/10 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about formulas, concepts, or page..."
            className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-black/15 dark:border-white/20 bg-neutral-50 dark:bg-[#18181C] text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none focus:border-black/40 dark:focus:border-white/40"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:opacity-90 disabled:opacity-40 transition-opacity shadow-xs cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </aside>
  );
};
