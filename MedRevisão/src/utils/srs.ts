import { addDays } from 'date-fns';

/**
 * SM-2 Algorithm implementation
 * @param quality 0-5 (0: total blackout, 5: perfect response)
 * @param repetitions Number of successful repetitions
 * @param previousInterval Previous interval in days
 * @param previousEase Previous easiness factor
 * @returns { interval: number, ease: number, repetitions: number }
 */
export function calculateNextReview(
  quality: number,
  repetitions: number,
  previousInterval: number,
  previousEase: number
) {
  let interval: number;
  let ease: number;
  let nextRepetitions: number;

  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(previousInterval * previousEase);
    }
    nextRepetitions = repetitions + 1;
  } else {
    interval = 1;
    nextRepetitions = 0;
  }

  ease = previousEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ease < 1.3) ease = 1.3;

  return {
    interval,
    ease,
    repetitions: nextRepetitions,
    nextReviewDate: addDays(new Date(), interval).toISOString(),
  };
}

export function accuracyToQuality(correct: number, total: number): number {
  if (total === 0) return 0;
  const accuracy = correct / total;
  if (accuracy >= 0.95) return 5;
  if (accuracy >= 0.85) return 4;
  if (accuracy >= 0.70) return 3;
  if (accuracy >= 0.50) return 2;
  if (accuracy >= 0.30) return 1;
  return 0;
}
