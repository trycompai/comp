'use client';

import { trainingVideos } from '@/lib/data/training-videos';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { cn } from '@comp/ui/cn';
import type { EmployeeTrainingVideoCompletion } from '@db';
import { CheckCircle2, Circle } from 'lucide-react';
import { VideoCarousel } from '../video/VideoCarousel';

interface GeneralTrainingAccordionItemProps {
  trainingVideoCompletions: EmployeeTrainingVideoCompletion[];
}

export function GeneralTrainingAccordionItem({
  trainingVideoCompletions,
}: GeneralTrainingAccordionItemProps) {
  console.log('[GeneralTrainingAccordionItem] Received completions:', {
    count: trainingVideoCompletions.length,
    completions: trainingVideoCompletions.map((c) => ({
      videoId: c.videoId,
      completedAt: c.completedAt,
    })),
  });

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
    <AccordionItem value="general-training" className="border rounded-xs">
      <AccordionTrigger className="px-4 hover:no-underline [&[data-state=open]]:pb-2">
        <div className="flex items-center gap-3">
          {hasCompletedGeneralTraining ? (
            <CheckCircle2 className="text-primary h-5 w-5" />
          ) : (
            <Circle className="text-muted-foreground h-5 w-5" />
          )}
          <span
            className={cn(
              'text-base',
              hasCompletedGeneralTraining && 'text-muted-foreground line-through',
            )}
          >
            Complete general security awareness training
          </span>
          {hasCompletedGeneralTraining ? (
            <span className="text-muted-foreground ml-auto text-sm">Secure annually</span>
          ) : (
            <span className="text-muted-foreground ml-auto text-sm">
              {completedCount}/{totalCount} completed
            </span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Complete the general security awareness training videos to learn about best practices
            for keeping company data secure.
          </p>

          {/* Only show videos that are general training (sat- prefix) */}
          <VideoCarousel videos={generalTrainingCompletions} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
