export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  original_filename?: string;
  storage_path?: string;
  mime_type?: string;
  file_url: string;
  file_size: number;
  file_hash?: string | null;
  page_count: number;
  category?: string | null;
  tags?: string | null;
  uploaded_by?: string | null;
  uploaded_at?: string;
  created_at: string;
  updated_at: string;
  last_opened_at: string;
  last_page: number;
  is_favorite?: boolean;
  folder?: string;
  status?: string;
  visibility?: string;
  view_count?: number;
  download_count?: number;
  processing_status?: 'uploading' | 'processing' | 'ready' | 'failed' | string;
  text_extraction_status?: 'pending' | 'processing' | 'completed' | 'failed' | string;
  ai_indexing_status?: 'pending' | 'processing' | 'completed' | 'failed' | string;
  pages?: DocumentPage[];
  _count?: {
    notes?: number;
    annotations?: number;
    flashcards?: number;
  };
}

export interface Report {
  id: string;
  document_id: string;
  reported_by: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken' | string;
  created_at: string;
}

export interface DocumentPage {
  id: string;
  document_id: string;
  page_number: number;
  text: string;
  width: number;
  height: number;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  page_number: number;
  section?: string | null;
  chunk_index: number;
  text: string;
  embedding?: string | null;
}

export interface AnnotationCoordinates {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  width?: number; // normalized 0..1
  height?: number; // normalized 0..1
  points?: Array<{ x: number; y: number }>; // for freehand ink strokes
  rects?: Array<{ x: number; y: number; width: number; height: number }>; // multi-line/multi-rect highlights
}

export interface Annotation {
  id: string;
  document_id: string;
  user_id: string;
  page_number: number;
  type: 'highlight' | 'underline' | 'ink' | 'note';
  coordinates: AnnotationCoordinates;
  content?: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  document_id: string;
  page_number: number;
  selected_text?: string | null;
  content: string;
  coordinates?: { x: number; y: number } | null;
  created_at: string;
  updated_at: string;
}

export interface Flashcard {
  id: string;
  user_id: string;
  document_id: string;
  source_page: number;
  question: string;
  answer: string;
  difficulty: number; // 0: new, 1: hard, 2: good, 3: easy
  next_review_at: string;
  review_count: number;
  interval_days: number;
  ease_factor: number;
  source_text?: string | null;
  tags?: string | null;
  created_at: string;
  document?: { title: string };
}

export interface QuestionOption {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface Question {
  id: string;
  user_id: string;
  document_id: string;
  source_page: number;
  topic: string;
  question: string;
  options: QuestionOption[];
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  difficulty: 'simple' | 'standard' | 'exam';
  created_at: string;
}

export interface Attempt {
  id: string;
  user_id: string;
  question_id: string;
  selected_answer: 'A' | 'B' | 'C' | 'D';
  correct: boolean;
  time_taken: number;
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  document_id: string;
  started_at: string;
  ended_at?: string | null;
  pages_read: number;
  duration_seconds: number;
  questions_done: number;
  flashcards_done: number;
}

export interface Topic {
  id: string;
  document_id: string;
  name: string;
  description?: string | null;
}

export interface UserTopicStats {
  id: string;
  user_id: string;
  topic_id: string;
  topic_name: string;
  attempts: number;
  correct: number;
  incorrect: number;
  confidence_score: number; // 0..100%
}

export interface Citation {
  document_id: string;
  document_title?: string;
  page_number: number;
  section?: string;
  snippet?: string;
}

export interface AIResponse {
  answer: string;
  citations: Citation[];
  suggested_followups?: string[];
}

export interface StudyRecommendation {
  availableMinutes: number;
  topic: string;
  pages: string;
  startPage: number;
  endPage: number;
  documentId: string;
  documentTitle: string;
  reason: string;
}
