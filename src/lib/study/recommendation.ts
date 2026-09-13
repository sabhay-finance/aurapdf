import { TopicAnalysis } from './weakTopics';

export interface NextStudyRecommendation {
  availableMinutes: number;
  topic: string;
  pages: string;
  startPage: number;
  endPage: number;
  documentId: string;
  documentTitle: string;
  reason: string;
  dueFlashcardsCount: number;
}

export function generateStudyRecommendation(params: {
  availableMinutes: number;
  documentId: string;
  documentTitle: string;
  currentPage: number;
  totalPages: number;
  topicAnalysis: TopicAnalysis[];
  dueFlashcardsCount: number;
}): NextStudyRecommendation {
  const {
    availableMinutes,
    documentId,
    documentTitle,
    currentPage,
    totalPages,
    topicAnalysis,
    dueFlashcardsCount,
  } = params;

  // Rule 1: Priority to weak topics with sufficient data
  const weakTopic = topicAnalysis.find((t) => t.isWeak);

  if (weakTopic && weakTopic.recommendedPages && weakTopic.recommendedPages.length > 0) {
    const startPage = Math.min(...weakTopic.recommendedPages);
    const endPage = Math.min(totalPages, startPage + Math.max(2, Math.floor(availableMinutes / 10)));
    const missedCount = weakTopic.totalAttempts - weakTopic.correctAttempts;

    return {
      availableMinutes,
      topic: weakTopic.topic,
      pages: `Pages ${startPage}–${endPage}`,
      startPage,
      endPage,
      documentId,
      documentTitle,
      reason: `You missed ${missedCount} of your last ${weakTopic.totalAttempts} ${weakTopic.topic} questions (${weakTopic.accuracyPercentage}% accuracy).`,
      dueFlashcardsCount,
    };
  }

  // Rule 2: Overdue flashcards
  if (dueFlashcardsCount > 0) {
    return {
      availableMinutes,
      topic: 'Active Recall & Due Flashcards',
      pages: `Page ${currentPage}`,
      startPage: currentPage,
      endPage: currentPage,
      documentId,
      documentTitle,
      reason: `You have ${dueFlashcardsCount} flashcards due for spaced-repetition review.`,
      dueFlashcardsCount,
    };
  }

  // Rule 3: Reading continuation
  const targetEnd = Math.min(totalPages, currentPage + Math.max(3, Math.floor(availableMinutes / 8)));
  return {
    availableMinutes,
    topic: 'Continue Curriculum Reading',
    pages: `Pages ${currentPage}–${targetEnd}`,
    startPage: currentPage,
    endPage: targetEnd,
    documentId,
    documentTitle,
    reason: `Continue through chapter concepts from your current reading position (Page ${currentPage} of ${totalPages}).`,
    dueFlashcardsCount,
  };
}
