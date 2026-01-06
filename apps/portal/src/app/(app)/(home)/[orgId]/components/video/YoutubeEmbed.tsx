'use client';

import type { EmployeeTrainingVideoCompletion } from '@db';
import { Button } from '@trycompai/design-system';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';

// Define our own TrainingVideo interface since we can't find the import
interface TrainingVideo {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  url: string;
}

// Define interface for the merged video object
interface MergedVideo extends TrainingVideo {
  completionStatus?: EmployeeTrainingVideoCompletion;
  isCompleted: boolean;
}

interface YoutubeEmbedProps {
  video: MergedVideo;
  isCompleted: boolean;
  onComplete: () => void;
  onNext?: () => void;
  allVideosCompleted: boolean;
  isMarkingComplete: boolean;
  onWatchAgain: () => void;
}

export function YoutubeEmbed({
  video,
  isCompleted,
  onComplete,
  onNext,
  allVideosCompleted,
  isMarkingComplete,
}: YoutubeEmbedProps) {
  const [isRewatching, setIsRewatching] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {!allVideosCompleted && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={onComplete} disabled={isCompleted}>
            <span className="inline-flex items-center gap-2">
              {isMarkingComplete ? <Loader2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              {isMarkingComplete
                ? 'Marking as Complete…'
                : isCompleted
                  ? 'Completed'
                  : 'Mark as Complete'}
            </span>
          </Button>
        </div>
      )}

      <div className="relative w-full pt-[56.25%]">
        {isCompleted && !isRewatching && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 backdrop-blur-sm">
            <div className="space-y-4 text-center">
              <Check className="h-12 w-12" />
              <p className="text-lg font-semibold">Video Completed</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setIsRewatching(true)}>
                  <span className="inline-flex items-center gap-2">Watch Again</span>
                </Button>
                {onNext && (
                  <Button onClick={onNext}>
                    <span className="inline-flex items-center gap-2">
                      Next Video
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${video.youtubeId}?enablejsapi=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
