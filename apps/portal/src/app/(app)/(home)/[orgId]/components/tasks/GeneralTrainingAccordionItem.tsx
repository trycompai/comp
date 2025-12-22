'use client';

import { trainingVideos } from '@/lib/data/training-videos';
import { CheckCircle2, ChevronDown, Circle } from 'lucide-react';
import type { EmployeePortalDashboard } from '../../types/employee-portal';
import { VideoCarousel } from '../video/VideoCarousel';

interface GeneralTrainingAccordionItemProps {
  trainingVideoCompletions: EmployeePortalDashboard['trainingVideos'];
}

export function GeneralTrainingAccordionItem({
  trainingVideoCompletions,
}: GeneralTrainingAccordionItemProps) {
  // Filter for general training videos (all 'sat-' prefixed videos)
  const generalTrainingVideoIds = trainingVideos
    .filter((video) => video.id.startsWith('sat-'))
    .map((video) => video.id);

  // Filter completions for general training videos only
  const generalTrainingCompletions = trainingVideoCompletions.filter((completion) =>
    generalTrainingVideoIds.includes(completion.videoId),
  );

  // Check if all general training videos are completed
  const completedVideoIds = new Set(
    generalTrainingCompletions
      .filter((completion) => completion.completedAt)
      .map((completion) => completion.videoId),
  );

  const hasCompletedGeneralTraining = generalTrainingVideoIds.every((videoId) =>
    completedVideoIds.has(videoId),
  );

  const completedCount = completedVideoIds.size;
  const totalCount = generalTrainingVideoIds.length;

  return (
    <details className="group px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 text-left">
          {hasCompletedGeneralTraining ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
          <span
            className={
              hasCompletedGeneralTraining
                ? 'text-sm font-medium text-muted-foreground line-through'
                : 'text-sm font-medium text-foreground'
            }
          >
            Complete general security awareness training
          </span>
          <span className="ml-auto text-sm text-muted-foreground">
            {hasCompletedGeneralTraining
              ? 'Secure annually'
              : `${completedCount}/${totalCount} completed`}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="mt-4 flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Complete the general security awareness training videos to learn about best practices for
          keeping company data secure.
        </p>

        <VideoCarousel videos={generalTrainingCompletions} />
      </div>
    </details>
  );
}
