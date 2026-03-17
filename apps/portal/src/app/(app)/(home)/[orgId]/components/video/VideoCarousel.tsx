'use client';

import { trainingVideos } from '@/lib/data/training-videos';
import { useTrainingCompletions } from '@/hooks/use-training-completions';
import { useState } from 'react';
import { CarouselControls } from './CarouselControls';
import { YoutubeEmbed } from './YoutubeEmbed';

export function VideoCarousel() {
  const { completions, markVideoComplete } = useTrainingCompletions();
  const [isExecuting, setIsExecuting] = useState(false);

  const completionRecordsMap = new Map(
    completions.map((record) => [record.videoId, record]),
  );

  const mergedVideos = trainingVideos.map((metadata) => {
    const completionRecord = completionRecordsMap.get(metadata.id);
    return {
      ...metadata,
      dbRecordId: completionRecord?.id,
      isCompleted: !!completionRecord?.completedAt,
    };
  });

  const completedVideoIds = new Set(
    mergedVideos.filter((v) => v.isCompleted).map((v) => v.id),
  );

  const lastCompletedIndex = (() => {
    const completedIndices = mergedVideos
      .map((video, index) => ({ index, completed: video.isCompleted }))
      .filter((item) => item.completed)
      .map((item) => item.index);
    return completedIndices.length > 0
      ? completedIndices[completedIndices.length - 1]
      : 0;
  })();

  const [currentIndex, setCurrentIndex] = useState(lastCompletedIndex);

  const goToPrevious = () => {
    const isFirstVideo = currentIndex === 0;
    setCurrentIndex(isFirstVideo ? mergedVideos.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    const currentMetadataId = mergedVideos[currentIndex].id;
    if (!completedVideoIds.has(currentMetadataId)) return;
    const isLastVideo = currentIndex === mergedVideos.length - 1;
    setCurrentIndex(isLastVideo ? 0 : currentIndex + 1);
  };

  const handleVideoComplete = async () => {
    const currentVideo = mergedVideos[currentIndex];
    if (completedVideoIds.has(currentVideo.id)) return;

    setIsExecuting(true);
    try {
      await markVideoComplete(currentVideo.id);
    } finally {
      setIsExecuting(false);
    }
  };

  const isCurrentVideoCompleted = completedVideoIds.has(
    mergedVideos[currentIndex].id,
  );
  const hasNextVideo = currentIndex < mergedVideos.length - 1;
  const allVideosCompleted = trainingVideos.every((metadata) =>
    completedVideoIds.has(metadata.id),
  );

  return (
    <div className="space-y-4">
      {allVideosCompleted && (
        <div className="flex w-full flex-col items-center justify-center space-y-2 py-8">
          <h2 className="text-2xl font-semibold">
            All Training Videos Completed!
          </h2>
          <p className="text-muted-foreground text-center">
            You're all done, now your manager won't pester you!
          </p>
        </div>
      )}
      {!allVideosCompleted && (
        <>
          <YoutubeEmbed
            video={mergedVideos[currentIndex]}
            isCompleted={isCurrentVideoCompleted}
            onComplete={handleVideoComplete}
            isMarkingComplete={isExecuting}
            onNext={
              isCurrentVideoCompleted && hasNextVideo ? goToNext : undefined
            }
            allVideosCompleted={allVideosCompleted}
          />
          <CarouselControls
            currentIndex={currentIndex}
            total={mergedVideos.length}
            onPrevious={goToPrevious}
            onNext={
              isCurrentVideoCompleted && hasNextVideo ? goToNext : undefined
            }
          />
        </>
      )}
    </div>
  );
}
