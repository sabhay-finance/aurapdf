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

export class GeminiProvider implements AIProvider {
  name = 'Google Gemini 2.0';
  private apiKey: string;
  private fallback: LocalEngineProvider;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.fallback = new LocalEngineProvider();
  }

  private async callGeminiApi(prompt: string, maxTokens = 1200): Promise<string | null> {
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const model of models) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: maxTokens,
              },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        } else {
          console.warn(`Gemini model ${model} failed:`, res.status, await res.text());
        }
      } catch (err) {
        console.warn(`Gemini model ${model} network error:`, err);
      }
    }
    return null;
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
Follow these pedagogical guidelines strictly:
1. STRUCTURE & READABILITY:
   - Begin with a clear 1-2 sentence core concept summary.
   - Use clear markdown sections: "### 📖 Concept Breakdown", "#### 🔑 Key Definitions", "#### ⚙️ Mechanics & Decision Rules", "#### 💡 Exam Takeaway & Traps".
   - Bold key terms on first mention.
2. GROUNDING:
   - Ground every statement directly in the provided textbook excerpts.
   - Always reference exact pages like "[Page X]" whenever presenting facts, formulas, or rules.
   - If the student asks to explain a page, synthesize all the major concepts, definitions, and rules on that page.
3. ADAPT TO LEVEL (${params.explanationLevel || 'standard'}):
   - simple: Plain English, intuitive relatable analogies, minimal jargon.
   - standard: Professional academic explanation balancing rigor and intuition.
   - exam: Focus on exam-tested definitions, calculation formulas, traps (e.g. short-run vs long-run shutdown, ATC vs AVC).
4. Selected text context: ${params.selectedText ? `"${params.selectedText}"` : 'None'}.`;

      const userContent = `Textbook Context:\n${contextBlocks}\n\nStudent Inquiry: ${params.query}`;
      const text = await this.callGeminiApi(`${systemPrompt}\n\n${userContent}`, 1400);

      if (!text) {
        return this.fallback.generateAnswer(params);
      }

      const citations: CitationItem[] = params.chunks.map((c) => ({
        page_number: c.page_number,
        section: c.section || undefined,
        snippet: cleanExtractedText(c.text).slice(0, 120),
      }));

      return {
        answer: text,
        citations,
        suggested_followups: [
          `Can you break down the mathematical derivation or formula?`,
          `Give a practical exam calculation scenario`,
          `Create 3 flashcards for this concept`,
        ],
      };
    } catch (err) {
      console.error('Gemini error:', err);
      return this.fallback.generateAnswer(params);
    }
  }

  async summarize(params: {
    scope: 'page' | 'chapter' | 'document';
    pageNumber?: number;
    title: string;
    chunks: RetrievedChunk[];
  }): Promise<{ summary: string; citations: CitationItem[] }> {
    if (!this.apiKey || !params.chunks.length) {
      return this.fallback.summarize(params);
    }

    try {
      const context = params.chunks.map((c) => `[Page ${c.page_number}]: ${cleanExtractedText(c.text)}`).join('\n\n');
      const prompt = `You are an expert academic tutor. Provide a concise, high-yield summary of the following document excerpt from "${params.title}" (focusing on ${params.scope} level). Group key concepts into clear bullet points with bold headers.
Document Excerpts:
${context}`;

      const text = await this.callGeminiApi(prompt, 900);
      if (!text) return this.fallback.summarize(params);

      return {
        summary: text,
        citations: params.chunks.map((c) => ({ page_number: c.page_number, section: c.section || undefined })),
      };
    } catch (err) {
      return this.fallback.summarize(params);
    }
  }

  async explainSelection(params: {
    selectedText: string;
    pageNumber: number;
    surroundingText: string;
    mode: 'explain' | 'simple' | 'example';
  }): Promise<{ explanation: string; citations: CitationItem[] }> {
    if (!this.apiKey) {
      return this.fallback.explainSelection(params);
    }

    try {
      const prompt = `You are an expert academic tutor. Explain the following concept/passage in "${params.mode}" mode.
Selected text: "${cleanExtractedText(params.selectedText)}"
Context from Page ${params.pageNumber}: "${cleanExtractedText(params.surroundingText || params.selectedText)}"
Mode requirement:
${params.mode === 'simple' ? 'Explain in plain English with an intuitive analogy.' : params.mode === 'example' ? 'Provide a concrete, realistic real-world case study or numerical example.' : 'Provide a rigorous breakdown of key definitions, mechanics, and exam implications.'}`;

      const text = await this.callGeminiApi(prompt, 900);
      if (!text) return this.fallback.explainSelection(params);

      return {
        explanation: text,
        citations: [{ page_number: params.pageNumber, snippet: cleanExtractedText(params.selectedText) }],
      };
    } catch (err) {
      return this.fallback.explainSelection(params);
    }
  }

  async generateFlashcards(params: {
    chunks: RetrievedChunk[];
    count?: number;
  }): Promise<GeneratedFlashcard[]> {
    if (!this.apiKey || !params.chunks.length) {
      return this.fallback.generateFlashcards(params);
    }

    try {
      const count = params.count || 3;
      const context = params.chunks.map((c) => `[Page ${c.page_number} (${c.section || 'Concept'})]: ${cleanExtractedText(c.text)}`).join('\n\n');
      const prompt = `Extract exactly ${count} active-recall flashcards from the following textbook text. Return ONLY a valid JSON array matching this exact schema:
[
  {
    "question": "Clear, direct conceptual question",
    "answer": "Concise, precise factual answer",
    "source_page": number,
    "source_text": "Exact sentence or snippet supporting the card",
    "tags": "Short topic tag"
  }
]
Do not include markdown codeblocks or any commentary, output pure JSON only.

Document text:
${context}`;

      const rawText = await this.callGeminiApi(prompt, 1200);
      if (!rawText) return this.fallback.generateFlashcards(params);

      const cleanedJson = rawText.replace(/```json\n?|```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => ({
          question: String(item.question || 'Concept Recall'),
          answer: String(item.answer || ''),
          source_page: Number(item.source_page) || params.chunks[0]?.page_number || 1,
          source_text: String(item.source_text || item.answer || ''),
          tags: String(item.tags || 'Study Concept'),
        })).slice(0, count);
      }
      return this.fallback.generateFlashcards(params);
    } catch (err) {
      return this.fallback.generateFlashcards(params);
    }
  }

  async generateQuestions(params: {
    chunks: RetrievedChunk[];
    count?: number;
    difficulty?: 'simple' | 'standard' | 'exam';
  }): Promise<GeneratedQuestion[]> {
    if (!this.apiKey || !params.chunks.length) {
      return this.fallback.generateQuestions(params);
    }

    try {
      const count = params.count || 2;
      const context = params.chunks.map((c) => `[Page ${c.page_number}]: ${cleanExtractedText(c.text)}`).join('\n\n');
      const prompt = `Generate ${count} high-quality 4-option multiple choice practice questions testing comprehension of the following text (difficulty: ${params.difficulty || 'standard'}). Return ONLY a valid JSON array of objects with the exact schema:
[
  {
    "question": "Question text",
    "options": [
      { "key": "A", "text": "Option A" },
      { "key": "B", "text": "Option B" },
      { "key": "C", "text": "Option C" },
      { "key": "D", "text": "Option D" }
    ],
    "correct_answer": "A",
    "explanation": "Why this answer is correct and others are incorrect based on the text",
    "source_page": number,
    "topic": "Topic Name"
  }
]
Do not include markdown formatting or backticks, output pure JSON only.

Document text:
${context}`;

      const rawText = await this.callGeminiApi(prompt, 1500);
      if (!rawText) return this.fallback.generateQuestions(params);

      const cleanedJson = rawText.replace(/```json\n?|```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => ({
          question: String(item.question),
          options: item.options,
          correct_answer: item.correct_answer as 'A' | 'B' | 'C' | 'D',
          explanation: String(item.explanation),
          source_page: Number(item.source_page) || params.chunks[0]?.page_number || 1,
          topic: String(item.topic || 'Curriculum Comprehension'),
        })).slice(0, count);
      }
      return this.fallback.generateQuestions(params);
    } catch (err) {
      return this.fallback.generateQuestions(params);
    }
  }

  async detectTopics(chunks: RetrievedChunk[]): Promise<string[]> {
    return this.fallback.detectTopics(chunks);
  }
}
