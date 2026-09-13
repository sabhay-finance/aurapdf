import {
  AIProvider,
  RetrievedChunk,
  AnswerResult,
  CitationItem,
  GeneratedFlashcard,
  GeneratedQuestion,
  ExplanationLevel,
} from './types';
import { LocalEngineProvider } from './localEngine';
import { cleanExtractedText } from '../pdf/textCleaner';

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI GPT-4o';
  private apiKey: string;
  private fallback: LocalEngineProvider;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.fallback = new LocalEngineProvider();
  }

  async generateAnswer(params: {
    query: string;
    documentTitle: string;
    currentPage?: number;
    selectedText?: string;
    chunks: RetrievedChunk[];
    explanationLevel?: ExplanationLevel;
  }): Promise<AnswerResult> {
    if (!this.apiKey) {
      return this.fallback.generateAnswer(params);
    }

    try {
      const contextBlocks = params.chunks
        .map((c) => `[Document Page ${c.page_number} (${c.section || 'General'})]:\n${cleanExtractedText(c.text)}`)
        .join('\n\n');

      const systemPrompt = `You are AuraPDF's master academic tutor for a student studying "${params.documentTitle}".
Follow these principles:
1. Ground every statement directly in the provided document excerpts.
2. Structure answers with clear Markdown headings, bullet points, and bold terms.
3. Cite exact page numbers like "[Page X]" whenever stating facts or formulas.
4. Keep the explanation level suited to: ${params.explanationLevel || 'standard'}.
5. Selected text from student: ${params.selectedText ? `"${params.selectedText}"` : 'None'}.`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Document Context:\n${contextBlocks}\n\nStudent Question: ${params.query}` },
          ],
          temperature: 0.2,
          max_tokens: 1000,
        }),
      });

      if (!res.ok) {
        return this.fallback.generateAnswer(params);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';

      const citations: CitationItem[] = params.chunks.map((c) => ({
        page_number: c.page_number,
        section: c.section || undefined,
        snippet: c.text.slice(0, 100),
      }));

      return {
        answer: text,
        citations,
        suggested_followups: [
          `Can you break down the mathematical derivation?`,
          `Give a practical exam calculation scenario`,
        ],
      };
    } catch (err) {
      return this.fallback.generateAnswer(params);
    }
  }

  async summarize(params: {
    scope: 'page' | 'chapter' | 'document';
    pageNumber?: number;
    title: string;
    chunks: RetrievedChunk[];
  }): Promise<{ summary: string; citations: CitationItem[] }> {
    return this.fallback.summarize(params);
  }

  async explainSelection(params: {
    selectedText: string;
    pageNumber: number;
    surroundingText: string;
    mode: 'explain' | 'simple' | 'example';
  }): Promise<{ explanation: string; citations: CitationItem[] }> {
    return this.fallback.explainSelection(params);
  }

  async generateFlashcards(params: {
    chunks: RetrievedChunk[];
    count?: number;
  }): Promise<GeneratedFlashcard[]> {
    return this.fallback.generateFlashcards(params);
  }

  async generateQuestions(params: {
    chunks: RetrievedChunk[];
    count?: number;
    difficulty?: 'simple' | 'standard' | 'exam';
  }): Promise<GeneratedQuestion[]> {
    return this.fallback.generateQuestions(params);
  }

  async detectTopics(chunks: RetrievedChunk[]): Promise<string[]> {
    return this.fallback.detectTopics(chunks);
  }
}
