/**
 * Days until a saved idea resurfaces, per review stage. Expanding intervals like these are the
 * core of spaced repetition: each successful recall roughly doubles the gap.
 */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 16, 35, 75, 150, 300, 365, 365, 365];

export function nextReviewDate(stage: number, from: Date = new Date()): Date {
  const days = REVIEW_INTERVALS_DAYS[Math.min(Math.max(stage, 0), REVIEW_INTERVALS_DAYS.length - 1)];
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
