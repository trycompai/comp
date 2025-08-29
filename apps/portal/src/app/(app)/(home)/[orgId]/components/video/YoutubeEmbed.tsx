'use client';

import { Button } from '@comp/ui/button';
import type { EmployeeTrainingVideoCompletion } from '@db';
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
  onWatchAgain,
}: YoutubeEmbedProps) {
  const [isRewatching, setIsRewatching] = useState(false);

  const handleVideoEnded = () => {
    setIsRewatching(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!allVideosCompleted && (
          <Button
            variant={isCompleted ? 'secondary' : 'default'}
            onClick={onComplete}
            disabled={isCompleted}
            className="gap-2"
          >
            {isMarkingComplete ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Marking as Complete...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {isCompleted ? 'Completed' : 'Mark as Complete'}
              </>
            )}
          </Button>
        )}
      </div>
      <div className="relative aspect-video w-full">
        {isCompleted && !isRewatching && (
          <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-xs">
            <div className="space-y-4 text-center">
              <Check className="text-primary mx-auto h-12 w-12" />
              <h3 className="text-xl font-semibold">Video Completed</h3>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setIsRewatching(true)} className="gap-2">
                  Watch Again
                </Button>
                {onNext && (
                  <Button onClick={onNext} className="gap-2">
                    Next Video
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${video.youtubeId}?enablejsapi=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onEnded={handleVideoEnded}
        />
      </div>
    </div>
  );
}
