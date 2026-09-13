import {
  AIProvider,
  RetrievedChunk,
  AnswerResult,
  CitationItem,
  GeneratedFlashcard,
  GeneratedQuestion,
  ExplanationLevel,
  ChatMessageItem,
} from './types';
import { LocalEngineProvider } from './localEngine';
import { cleanExtractedText } from '../pdf/textCleaner';

interface GeminiTurn {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export class GeminiProvider implements AIProvider {
  name = 'Google Gemini 2.0';
  private apiKey: string;
  private fallback: LocalEngineProvider;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.fallback = new LocalEngineProvider();
  }

  /**
   * Calls Google Gemini Generative Language API with multi-turn message support,
   * system instruction, and automatic fallback between gemini-2.0-flash and gemini-1.5-flash.
   */
  private async callGeminiChat(
    contents: GeminiTurn[],
    systemInstruction?: string,
    temperature = 0.7,
    maxTokens = 2048
  ): Promise<{ text: string | null; error?: string }> {
    if (!this.apiKey) {
      return { text: null, error: 'NO_API_KEY' };
    }

    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    let lastError = '';

    for (const model of models) {
      try {
        const payload: Record<string, any> = {
          contents,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        };

        if (systemInstruction) {
          payload.systemInstruction = {
            parts: [{ text: systemInstruction }],
          };
        }

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const candidate = data.candidates?.[0];
          const text = candidate?.content?.parts?.[0]?.text;
          if (text) return { text: text.trim() };
        } else {
          const errText = await res.text();
          console.warn(`Gemini model ${model} returned error ${res.status}:`, errText);
          lastError = `${res.status}: ${errText}`;

          // If systemInstruction caused a 400 rejection, retry with system prompt prepended into first user turn
          if (res.status === 400 && systemInstruction) {
            const fallbackContents: GeminiTurn[] = [
              {
                role: 'user',
                parts: [
                  {
                    text: `[System Instructions & Persona]\n${systemInstruction}\n\n---\n${contents[0]?.parts[0]?.text || ''}`,
                  },
                ],
              },
              ...contents.slice(1),
            ];

            const retryRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: fallbackContents,
                  generationConfig: {
                    temperature,
                    maxOutputTokens: maxTokens,
                  },
                }),
              }
            );

            if (retryRes.ok) {
              const data = await retryRes.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) return { text: text.trim() };
            }
          }
        }
      } catch (err: any) {
        console.warn(`Gemini model ${model} network exception:`, err);
        lastError = err.message || 'Network error';
      }
    }

    return { text: null, error: lastError };
  }

  private async callGeminiApi(prompt: string, maxTokens = 1200): Promise<string | null> {
    const res = await this.callGeminiChat(
      [{ role: 'user', parts: [{ text: prompt }] }],
      undefined,
      0.3,
      maxTokens
    );
    return res.text;
  }

  async generateAnswer(params: {
    query: string;
    documentTitle: string;
    currentPage?: number;
    selectedText?: string;
    chunks: RetrievedChunk[];
    explanationLevel?: ExplanationLevel;
    history?: ChatMessageItem[];
  }): Promise<AnswerResult> {
    if (!this.apiKey) {
      return this.fallback.generateAnswer(params);
    }

    try {
      const contextBlocks = params.chunks
        .map((c) => `[Document Page ${c.page_number}${c.section ? ` - ${c.section}` : ''}]:\n${cleanExtractedText(c.text)}`)
        .join('\n\n');

      const systemPrompt = `You are Google Gemini, acting as an intelligent, conversational study tutor and AI companion for a student studying "${params.documentTitle}".

CRITICAL BEHAVIOR & GUIDELINES:
1. NATURAL CONVERSATION (LIKE STANDARD GOOGLE GEMINI):
   - Talk naturally, warmly, clearly, and directly — just like Google Gemini does in everyday chat.
   - If the student sends a casual message, greeting, or meta inquiry (e.g. "hi", "kya chal raha hai", "help me study"), respond warmly and conversationally.
   - LANGUAGE ADAPTABILITY:
     * If the student asks in Hindi or Hinglish (e.g. "bhai ye concept samjha de", "iska kya matlab hai", "aasan bhasha me batao"), respond naturally in friendly, clear Hindi/Hinglish!
     * If the student asks in English, respond in clear, articulate English.
2. CONVERSATION MEMORY & FOLLOW-UPS:
   - You have full memory of previous conversation turns.
   - Seamlessly handle follow-ups (e.g. "can you give an example of that?", "what about point 2?", "aur aage batao", "explain simpler").
3. GROUNDING IN STUDY MATERIAL:
   - When the student inquires about the document or its concepts, ground your explanation in the provided textbook excerpts.
   - Naturally cite page numbers like [Page ${params.currentPage || 'X'}] when referencing specific facts, formulas, or theorems.
   - If the student asks a general question, concept query, or calculation that extends beyond the provided excerpts, answer it comprehensively and accurately using your broad intelligence, connecting it back to the textbook topic.
4. ADAPT TO LEVEL (${params.explanationLevel || 'standard'}):
   - simple: Plain everyday language, intuitive analogies, minimal jargon (ELI5).
   - standard: Clear, balanced academic explanation with intuitive intuition and real-world relevance.
   - exam: High-yield definitions, exam traps, critical formulas, step-by-step problem-solving.
5. FORMATTING:
   - Use clean Markdown with bold key terms, bullet points, and code/math blocks when explaining complex concepts.
   - Do NOT force rigid, artificial headers onto simple conversational questions.`;

      let currentTurnText = '';
      if (contextBlocks.trim().length > 0) {
        currentTurnText += `[Document Excerpts from "${params.documentTitle}"]:\n${contextBlocks}\n\n`;
      }
      if (params.selectedText) {
        currentTurnText += `[User Highlighted Text on Page ${params.currentPage || 1}]: "${cleanExtractedText(params.selectedText)}"\n\n`;
      }
      currentTurnText += `Student Query: ${params.query}`;

      // Build strictly alternating Gemini conversation history: user -> model -> user -> model...
      const contents: GeminiTurn[] = [];
      let hasSeenUser = false;

      if (params.history && params.history.length > 0) {
        for (const msg of params.history) {
          if (msg.role === 'user') {
            hasSeenUser = true;
          }
          // Skip leading model/welcome messages before first user turn
          if (!hasSeenUser) continue;

          const geminiRole = msg.role === 'assistant' ? 'model' : 'user';
          const text = msg.content.trim();
          if (!text) continue;

          if (contents.length > 0 && contents[contents.length - 1].role === geminiRole) {
            // Merge consecutive turns with identical role to adhere to Gemini API constraints
            contents[contents.length - 1].parts[0].text += `\n\n${text}`;
          } else {
            contents.push({ role: geminiRole, parts: [{ text }] });
          }
        }
      }

      // Append current user turn
      if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
        contents[contents.length - 1].parts[0].text += `\n\n${currentTurnText}`;
      } else {
        contents.push({ role: 'user', parts: [{ text: currentTurnText }] });
      }

      const { text, error } = await this.callGeminiChat(contents, systemPrompt, 0.7, 2048);

      if (!text) {
        // If API key was provided but failed authentication, display a helpful diagnostic
        if (error && (error.includes('400') || error.includes('403') || error.includes('API_KEY') || error.includes('401'))) {
          return {
            answer: `### 🔑 Google Gemini API Notice\n\nGoogle Gemini could not authenticate with your API key.\n\n**Error Details:** \`${error}\`\n\n**Quick Fix:**\n1. Ensure you generated a valid API key from [Google AI Studio](https://aistudio.google.com/app/apikey).\n2. Enter or update your key in the AI sidebar header or Settings.\n3. Make sure the Generative Language API is enabled on your Google Cloud / AI Studio project.`,
            citations: [],
            suggested_followups: ['How do I get a free Gemini API key?'],
          };
        }
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
          'Can you give a practical real-world example?',
          'Break down the core formula or rule step-by-step',
          'Test my understanding with an exam question',
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
      const prompt = `You are Google Gemini acting as an expert academic tutor. Provide a concise, high-yield summary of the following document excerpt from "${params.title}" (focusing on ${params.scope} level). Group key concepts into clear bullet points with bold headers.
Document Excerpts:
${context}`;

      const text = await this.callGeminiApi(prompt, 1200);
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
      const prompt = `You are Google Gemini acting as an expert study tutor. Explain the following concept/passage in "${params.mode}" mode.
Selected text: "${cleanExtractedText(params.selectedText)}"
Context from Page ${params.pageNumber}: "${cleanExtractedText(params.surroundingText || params.selectedText)}"
Mode requirement:
${params.mode === 'simple' ? 'Explain in plain, conversational language with an intuitive everyday analogy (ELI5).' : params.mode === 'example' ? 'Provide a concrete, realistic real-world case study or practical calculation example.' : 'Provide a rigorous breakdown of key definitions, mechanics, and exam implications.'}`;

      const text = await this.callGeminiApi(prompt, 1000);
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
      const context = params.chunks.map((c) => `[Concept Context (Page ${c.page_number})]: ${cleanExtractedText(c.text)}`).join('\n\n');
      const prompt = `Generate ${count} high-quality 4-option multiple choice practice questions testing comprehension of the following text (difficulty: ${params.difficulty || 'standard'}).

CRITICAL QUESTION CONSTRAINTS:
1. ASK QUESTIONS DIRECTLY: Just ask the question itself (e.g. "Which of the following statements regarding TVM is accurate?", "What is the primary factor that causes...?", "How does an increase in inflation impact...?").
2. DO NOT REFER TO PAGES: NEVER start or phrase questions with "Based on Page X...", "According to the document/page...", or "In this section...". Ask direct conceptual exam questions.
3. Distribute the correct answer naturally among options A, B, C, and D.
4. Return ONLY a valid JSON array of objects with the exact schema:
[
  {
    "question": "Direct question text (NO page references)",
    "options": [
      { "key": "A", "text": "Option A" },
      { "key": "B", "text": "Option B" },
      { "key": "C", "text": "Option C" },
      { "key": "D", "text": "Option D" }
    ],
    "correct_answer": "A",
    "explanation": "Why this answer is correct based on the concept",
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
