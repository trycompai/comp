'use client';

import { trainingVideos } from '@/lib/data/training-videos';
import type { EmployeeTrainingVideoCompletion } from '@db';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  cn,
} from '@trycompai/design-system';
import { CheckmarkFilled, CircleDash } from '@trycompai/design-system/icons';
import { useCallback, useState } from 'react';
import { VideoCarousel } from '../video/VideoCarousel';

interface GeneralTrainingAccordionItemProps {
  trainingVideoCompletions: EmployeeTrainingVideoCompletion[];
}

export function GeneralTrainingAccordionItem({
  trainingVideoCompletions,
}: GeneralTrainingAccordionItemProps) {
  // Filter for general training videos (all 'sat-' prefixed videos)
  const generalTrainingVideoIds = trainingVideos
    .filter((video) => video.id.startsWith('sat-'))
    .map((video) => video.id);

  // Track completed video IDs in local state so count updates in real time
  const [completedVideoIds, setCompletedVideoIds] = useState<Set<string>>(() => {
    const generalCompletions = trainingVideoCompletions.filter((c) =>
      generalTrainingVideoIds.includes(c.videoId),
    );
    return new Set(
      generalCompletions.filter((c) => c.completedAt).map((c) => c.videoId),
    );
  });

  const handleVideoComplete = useCallback((videoId: string) => {
    setCompletedVideoIds((prev) => new Set([...prev, videoId]));
  }, []);

  const hasCompletedGeneralTraining = generalTrainingVideoIds.every((videoId) =>
    completedVideoIds.has(videoId),
  );

  const completedCount = completedVideoIds.size;
  const totalCount = generalTrainingVideoIds.length;

  return (
    <div className="border rounded-xs">
      <AccordionItem value="general-training">
        <div className="px-4">
          <AccordionTrigger>
            <div className="flex items-center gap-3">
              {hasCompletedGeneralTraining ? (
                <div className="text-primary"><CheckmarkFilled size={20} /></div>
              ) : (
                <div className="text-muted-foreground"><CircleDash size={20} /></div>
              )}
              <span
                className={cn(
                  'text-base',
                  hasCompletedGeneralTraining && 'text-muted-foreground line-through',
                )}
              >
                Security Awareness Training
              </span>
              {!hasCompletedGeneralTraining && totalCount > 0 && (
                <Badge variant="outline">
                  {completedCount}/{totalCount}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
        </div>
        <AccordionContent>
          <div className="px-4 pb-4 space-y-4">
            <p className="text-muted-foreground text-sm">
              Complete the security awareness training videos to learn about best practices for
              keeping company data secure.
            </p>

            {/* Only show videos that are general training (sat- prefix) */}
            <VideoCarousel videos={trainingVideoCompletions.filter((c) => generalTrainingVideoIds.includes(c.videoId))} onVideoComplete={handleVideoComplete} />
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}
