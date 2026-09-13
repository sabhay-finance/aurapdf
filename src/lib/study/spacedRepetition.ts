/**
 * Spaced Repetition calculation (SM-2 variant)
 * Rating: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
 */
export interface SRSReviewResult {
  interval_days: number;
  ease_factor: number;
  review_count: number;
  next_review_at: Date;
  difficulty: number;
}

export function calculateNextReview(
  rating: number, // 1, 2, 3, or 4
  currentIntervalDays = 1,
  currentEaseFactor = 2.5,
  currentReviewCount = 0
): SRSReviewResult {
  let interval = currentIntervalDays;
  let easeFactor = currentEaseFactor;
  let reviewCount = currentReviewCount;

  if (rating === 1) {
    // Again: reset interval
    interval = 1;
    reviewCount = 0;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else {
    // Success (Hard, Good, Easy)
    reviewCount += 1;
    if (reviewCount === 1) {
      interval = 1;
    } else if (reviewCount === 2) {
      interval = 3;
    } else {
      interval = Math.round(currentIntervalDays * easeFactor);
    }

    if (rating === 2) {
      // Hard
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      interval = Math.max(1, Math.round(interval * 0.8));
    } else if (rating === 4) {
      // Easy
      easeFactor += 0.15;
      interval = Math.round(interval * 1.3);
    }
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    interval_days: interval,
    ease_factor: Number(easeFactor.toFixed(2)),
    review_count: reviewCount,
    next_review_at: nextReview,
    difficulty: rating,
  };
}
