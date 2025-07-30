import { TaskFrequency } from '@db';
import { differenceInDays, startOfDay } from 'date-fns';

interface ReviewInfo {
  nextReviewDate: Date;
  daysUntil: number;
  isUrgent: boolean;
}

export function calculateNextReview(
  lastCompletedAt: Date | null,
  frequency: TaskFrequency | null,
  urgentThresholdDays = 7,
): ReviewInfo | null {
  if (!frequency || !lastCompletedAt) return null;

  const baseDate = new Date(lastCompletedAt);
  const nextReviewDate = new Date(baseDate);

  switch (frequency) {
    case 'monthly':
      nextReviewDate.setMonth(nextReviewDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextReviewDate.setMonth(nextReviewDate.getMonth() + 3);
      break;
    case 'yearly':
      nextReviewDate.setFullYear(nextReviewDate.getFullYear() + 1);
      break;
    default:
      return null;
  }

  // Use date-fns for consistent date calculations
  const today = startOfDay(new Date());
  const reviewDay = startOfDay(nextReviewDate);
  const daysUntil = differenceInDays(reviewDay, today);

  return {
    nextReviewDate,
    daysUntil,
    isUrgent: daysUntil < urgentThresholdDays,
  };
}
