'use client';

import { apiClient } from '@/lib/api-client';
import { trainingVideos } from '@/lib/data/training-videos';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSWRConfig } from 'swr';
import type { EmployeePortalDashboard } from '../../types/employee-portal';
import { CarouselControls } from './CarouselControls';
import { YoutubeEmbed } from './YoutubeEmbed';

interface VideoCarouselProps {
  videos: EmployeePortalDashboard['trainingVideos'];
}

export function VideoCarousel({ videos }: VideoCarouselProps) {
  // Create a map of completion records by their videoId for efficient lookup
  // videoId in the DB record corresponds to the id in the metadata
  const completionRecordsMap = new Map(videos.map((record) => [record.videoId, record]));
  const { orgId } = useParams<{ orgId: string }>();

  // Create our merged videos array by enriching metadata with completion status
  const mergedVideos = trainingVideos.map((metadata) => {
    const completionRecord = completionRecordsMap.get(metadata.id); // Match metadata.id with record.videoId
    return {
      ...metadata, // Spread metadata fields (id, title, youtubeId, etc.)
      dbRecordId: completionRecord?.id, // Store the database *record* ID if it exists
      isCompleted: !!completionRecord?.completedAt, // Check if the record has a completedAt timestamp
    };
  });

  // Find the index of the last completed video to start the carousel there
  const lastCompletedIndex = (() => {
    const completedIndices = mergedVideos
      .map((video, index) => ({
        index,
        completed: video.isCompleted,
      }))
      .filter((item) => item.completed)
      .map((item) => item.index);

    // Default to the first video (index 0) if none are completed
    return completedIndices.length > 0 ? completedIndices[completedIndices.length - 1] : 0;
  })();

  const [currentIndex, setCurrentIndex] = useState(lastCompletedIndex);

  // Local state to track completed videos in the UI (using metadata IDs)
  const initialCompletedVideoIds = new Set(
    mergedVideos.filter((video) => video.isCompleted).map((video) => video.id), // Use metadata id
  );

  const [completedVideoIds, setCompletedVideoIds] = useState<Set<string>>(initialCompletedVideoIds);

  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const { mutate } = useSWRConfig();

  // Effect to synchronize local UI state with changes in DB records (props)
  useEffect(() => {
    const newCompletionRecordsMap = new Map(videos.map((record) => [record.videoId, record]));
    const newCompletedVideoIds = new Set(
      trainingVideos
        .filter((metadata) => !!newCompletionRecordsMap.get(metadata.id)?.completedAt)
        .map((metadata) => metadata.id), // Use metadata id
    );
    setCompletedVideoIds(newCompletedVideoIds);
  }, [videos]); // Depend only on the DB records prop

  const goToPrevious = () => {
    const isFirstVideo = currentIndex === 0;
    const newIndex = isFirstVideo ? mergedVideos.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    const currentMetadataId = mergedVideos[currentIndex].id;
    // Allow going next only if the current video is marked complete in the local state
    if (!completedVideoIds.has(currentMetadataId)) return;
    const isLastVideo = currentIndex === mergedVideos.length - 1;
    const newIndex = isLastVideo ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  const handleVideoComplete = async () => {
    const currentVideo = mergedVideos[currentIndex];
    const metadataVideoId = currentVideo.id; // This is the ID like 'sat-1'

    // Check if already marked complete in local state to avoid redundant calls
    if (completedVideoIds.has(metadataVideoId)) {
      return;
    }

    setIsMarkingComplete(true);
    try {
      const res = await apiClient.post<{ success: boolean }>(
        `/v1/people/me/training-videos/${metadataVideoId}/complete`,
        undefined,
        orgId,
      );
      if (res.error) {
        console.error('Failed to mark video as completed:', res.error);
        return;
      }

      setCompletedVideoIds((prev) => new Set([...prev, metadataVideoId]));
      await mutate(['employee-portal-overview', orgId]);
    } finally {
      setIsMarkingComplete(false);
    }
  };

  // Determine completion based on the local UI state (using metadata ID)
  const isCurrentVideoCompleted = completedVideoIds.has(mergedVideos[currentIndex].id);
  const hasNextVideo = currentIndex < mergedVideos.length - 1;
  // Determine if all videos are complete based on local UI state
  const allVideosCompleted = trainingVideos.every((metadata) => completedVideoIds.has(metadata.id));

  return (
    <div className="flex flex-col gap-4">
      {allVideosCompleted && (
        <div className="py-8 text-center">
          <p className="text-xl font-semibold">All Training Videos Completed!</p>
          <p className="text-sm text-muted-foreground">
            You're all done, now your manager won't pester you!
          </p>
        </div>
      )}
      {!allVideosCompleted && (
        <>
          <YoutubeEmbed
            video={mergedVideos[currentIndex]} // Pass the merged object
            isCompleted={isCurrentVideoCompleted} // Use local state for UI
            onComplete={handleVideoComplete}
            isMarkingComplete={isMarkingComplete}
            onNext={isCurrentVideoCompleted && hasNextVideo ? goToNext : undefined}
            allVideosCompleted={allVideosCompleted} // Use local state for UI
            onWatchAgain={() => {
              // Reset the rewatching state if needed inside YoutubeEmbed
              // No direct action needed here unless YoutubeEmbed needs reset
            }}
          />
          <CarouselControls
            currentIndex={currentIndex}
            total={mergedVideos.length}
            onPrevious={goToPrevious}
            onNext={isCurrentVideoCompleted && hasNextVideo ? goToNext : undefined}
          />
        </>
      )}
    </div>
  );
}
