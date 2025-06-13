"use client";

import type {
	EmployeeTrainingVideoCompletion,
	Member,
	User,
} from "@comp/db/types";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { markVideoAsCompleted } from "../../../actions/markVideoAsCompleted";
import { CarouselControls } from "./CarouselControls";
import { YoutubeEmbed } from "./YoutubeEmbed";
import { trainingVideos } from "@/lib/data/training-videos";

interface VideoCarouselProps {
	videos: EmployeeTrainingVideoCompletion[];
	member: Member & { user?: User };
}

export function VideoCarousel({ videos, member }: VideoCarouselProps) {
	// Create a map of completion records by their videoId for efficient lookup
	// videoId in the DB record corresponds to the id in the metadata
	const completionRecordsMap = new Map(
		videos.map((record) => [record.videoId, record]),
	);

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
		return completedIndices.length > 0
			? completedIndices[completedIndices.length - 1]
			: 0;
	})();

	const [currentIndex, setCurrentIndex] = useState(lastCompletedIndex);

	// Local state to track completed videos in the UI (using metadata IDs)
	const initialCompletedVideoIds = new Set(
		mergedVideos
			.filter((video) => video.isCompleted)
			.map((video) => video.id), // Use metadata id
	);

	const [completedVideoIds, setCompletedVideoIds] = useState<Set<string>>(
		initialCompletedVideoIds,
	);

	const { execute: executeMarkComplete } = useAction(markVideoAsCompleted, {
		onSuccess: (data) => {
			// Update local UI state immediately upon successful action
			const completedMetadataId = mergedVideos[currentIndex].id;
			setCompletedVideoIds((prev) => new Set([...prev, completedMetadataId]));
		},
		onError: (error) => {
			console.error("Failed to mark video as completed:", error);
			// TODO: Consider showing a user-facing toast notification
		},
	});

	// Effect to synchronize local UI state with changes in DB records (props)
	useEffect(() => {
		const newCompletionRecordsMap = new Map(
			videos.map((record) => [record.videoId, record]),
		);
		const newCompletedVideoIds = new Set(
			trainingVideos
				.filter(
					(metadata) => !!newCompletionRecordsMap.get(metadata.id)?.completedAt,
				)
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

		// Find the corresponding original DB record using the metadata ID
		const originalDbRecord = completionRecordsMap.get(metadataVideoId);

		if (!originalDbRecord) {
			console.error(
				"Original DB completion record not found for metadata ID:",
				metadataVideoId,
				"Cannot execute server action. Ensure the server action handles record creation (upsert).",
			);
			// TODO: Notify user or handle the case where the record needs creation first.
			return;
		}

		const dbRecordId = originalDbRecord.id; // The actual primary key ID from the database

		// Execute the action with the correct Database Record ID
		executeMarkComplete({ videoId: dbRecordId });
	};

	// Determine completion based on the local UI state (using metadata ID)
	const isCurrentVideoCompleted = completedVideoIds.has(
		mergedVideos[currentIndex].id,
	);
	const hasNextVideo = currentIndex < mergedVideos.length - 1;
	// Determine if all videos are complete based on local UI state
	const allVideosCompleted = trainingVideos.every((metadata) =>
		completedVideoIds.has(metadata.id),
	);

	return (
		<div className="space-y-4">
			{allVideosCompleted && (
				<div className="w-full flex flex-col items-center justify-center py-8 space-y-2">
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
						video={mergedVideos[currentIndex]} // Pass the merged object
						isCompleted={isCurrentVideoCompleted} // Use local state for UI
						onComplete={handleVideoComplete}
						onNext={
							isCurrentVideoCompleted && hasNextVideo ? goToNext : undefined
						}
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
						onNext={
							isCurrentVideoCompleted && hasNextVideo ? goToNext : undefined
						}
					/>
				</>
			)}
		</div>
	);
}
