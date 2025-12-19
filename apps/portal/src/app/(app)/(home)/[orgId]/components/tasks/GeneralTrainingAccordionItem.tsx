'use client';

import { trainingVideos } from '@/lib/data/training-videos';
import type { EmployeeTrainingVideoCompletion } from '@db';
import { Accordion, HStack, Text, VStack } from '@trycompai/ui-v2';
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
    <Accordion.Item value="general-training">
      <Accordion.ItemTrigger>
        <HStack gap="3" flex="1" textAlign="start">
          {hasCompletedGeneralTraining ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
          <Text
            textStyle="md"
            color={hasCompletedGeneralTraining ? 'fg.muted' : 'fg'}
            textDecoration={hasCompletedGeneralTraining ? 'line-through' : undefined}
          >
            Complete general security awareness training
          </Text>
          <Text fontSize="sm" color="fg.muted" marginStart="auto">
            {hasCompletedGeneralTraining
              ? 'Secure annually'
              : `${completedCount}/${totalCount} completed`}
          </Text>
        </HStack>
        <Accordion.ItemIndicator />
      </Accordion.ItemTrigger>

      <Accordion.ItemContent>
        <Accordion.ItemBody>
          <VStack align="stretch" gap="4">
            <Text fontSize="sm" color="fg.muted">
              Complete the general security awareness training videos to learn about best practices
              for keeping company data secure.
            </Text>

            <VideoCarousel videos={generalTrainingCompletions} />
          </VStack>
        </Accordion.ItemBody>
      </Accordion.ItemContent>
    </Accordion.Item>
  );
}
