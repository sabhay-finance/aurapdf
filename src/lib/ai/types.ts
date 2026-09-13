export type ExplanationLevel = 'simple' | 'standard' | 'exam' | 'detailed';

export interface RetrievedChunk {
  page_number: number;
  section?: string | null;
  text: string;
  score?: number;
}

export interface CitationItem {
  page_number: number;
  section?: string;
  snippet?: string;
}

export interface AnswerResult {
  answer: string;
  citations: CitationItem[];
  suggested_followups?: string[];
}

export interface GeneratedFlashcard {
  question: string;
  answer: string;
  source_page: number;
  source_text: string;
  tags: string;
}

export interface GeneratedQuestion {
  question: string;
  options: Array<{ key: 'A' | 'B' | 'C' | 'D'; text: string }>;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  source_page: number;
  topic: string;
}

export interface ChatMessageItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  name: string;
  
  generateAnswer(params: {
    query: string;
    documentTitle: string;
    currentPage?: number;
    selectedText?: string;
    chunks: RetrievedChunk[];
    explanationLevel?: ExplanationLevel;
    history?: ChatMessageItem[];
  }): Promise<AnswerResult>;

  summarize(params: {
    scope: 'page' | 'chapter' | 'document';
    pageNumber?: number;
    title: string;
    chunks: RetrievedChunk[];
  }): Promise<{ summary: string; citations: CitationItem[] }>;

  explainSelection(params: {
    selectedText: string;
    pageNumber: number;
    surroundingText: string;
    mode: 'explain' | 'simple' | 'example';
  }): Promise<{ explanation: string; citations: CitationItem[] }>;

  generateFlashcards(params: {
    chunks: RetrievedChunk[];
    count?: number;
  }): Promise<GeneratedFlashcard[]>;

  generateQuestions(params: {
    chunks: RetrievedChunk[];
    count?: number;
    difficulty?: 'simple' | 'standard' | 'exam';
  }): Promise<GeneratedQuestion[]>;

  detectTopics(chunks: RetrievedChunk[]): Promise<string[]>;
}
