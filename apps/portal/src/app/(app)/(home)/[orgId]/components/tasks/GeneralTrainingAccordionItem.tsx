'use client';

import { trainingVideos } from '@/lib/data/training-videos';
import { useTrainingCompletions } from '@/hooks/use-training-completions';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  cn,
} from '@trycompai/design-system';
import { CheckmarkFilled, CircleDash } from '@trycompai/design-system/icons';
import { VideoCarousel } from '../video/VideoCarousel';

const generalTrainingVideoIds = trainingVideos
  .filter((video) => video.id.startsWith('sat-'))
  .map((video) => video.id);

export function GeneralTrainingAccordionItem() {
  const { completions } = useTrainingCompletions();

  const completedVideoIds = new Set(
    completions
      .filter(
        (c) =>
          generalTrainingVideoIds.includes(c.videoId) &&
          c.completedAt !== null,
      )
      .map((c) => c.videoId),
  );

  const hasCompletedGeneralTraining = generalTrainingVideoIds.every(
    (videoId) => completedVideoIds.has(videoId),
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
                <div className="text-primary">
                  <CheckmarkFilled size={20} />
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <CircleDash size={20} />
                </div>
              )}
              <span
                className={cn(
                  'text-base',
                  hasCompletedGeneralTraining &&
                    'text-muted-foreground line-through',
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
              Complete the security awareness training videos to learn about
              best practices for keeping company data secure.
            </p>
            <VideoCarousel />
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}
