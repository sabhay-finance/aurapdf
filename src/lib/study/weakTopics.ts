export interface TopicAnalysis {
  topic: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracyPercentage: number;
  isWeak: boolean;
  hasEnoughData: boolean; // >= 3 attempts
  confidenceLabel: string;
  recommendedPages?: number[];
}

export function analyzeTopicPerformance(
  attempts: Array<{
    correct: boolean;
    question: {
      topic: string;
      source_page: number;
    };
  }>,
  minAttemptsForCertainty = 3
): TopicAnalysis[] {
  const map = new Map<
    string,
    { total: number; correct: number; pages: Set<number> }
  >();

  for (const att of attempts) {
    const topic = att.question.topic;
    if (!map.has(topic)) {
      map.set(topic, { total: 0, correct: 0, pages: new Set() });
    }
    const item = map.get(topic)!;
    item.total += 1;
    if (att.correct) item.correct += 1;
    item.pages.add(att.question.source_page);
  }

  const results: TopicAnalysis[] = [];

  map.forEach((value, topic) => {
    const accuracy = Math.round((value.correct / value.total) * 100);
    const hasEnoughData = value.total >= minAttemptsForCertainty;
    const isWeak = hasEnoughData && accuracy < 65;

    results.push({
      topic,
      totalAttempts: value.total,
      correctAttempts: value.correct,
      accuracyPercentage: accuracy,
      isWeak,
      hasEnoughData,
      confidenceLabel: hasEnoughData
        ? `${accuracy}% accuracy (${value.correct}/${value.total})`
        : `Not enough practice data yet (${value.total}/${minAttemptsForCertainty} attempts)`,
      recommendedPages: Array.from(value.pages),
    });
  });

  // Sort: weak topics first, then ascending by accuracy
  results.sort((a, b) => a.accuracyPercentage - b.accuracyPercentage);

  return results;
}
