'use client';

import type { EmployeeTrainingVideoCompletion } from '@db';
import { Box, Button, chakra, HStack, Text, VStack } from '@trycompai/ui-v2';
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
  const YoutubeIframe = chakra('iframe');

  return (
    <VStack align="stretch" gap="4">
      {!allVideosCompleted && (
        <HStack justify="flex-end">
          <Button
            variant="outline"
            colorPalette={isCompleted ? 'secondary' : 'primary'}
            onClick={onComplete}
            disabled={isCompleted}
            loading={isMarkingComplete}
          >
            <HStack gap="2">
              {isMarkingComplete ? (
                <>
                  <Loader2 className="h-4 w-4" />
                  <Text as="span">Marking as Complete...</Text>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <Text as="span">{isCompleted ? 'Completed' : 'Mark as Complete'}</Text>
                </>
              )}
            </HStack>
          </Button>
        </HStack>
      )}

      <Box position="relative" width="full" paddingTop="56.25%">
        {isCompleted && !isRewatching && (
          <Box
            position="absolute"
            inset="0"
            zIndex="1"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="bg"
            opacity={0.9}
            backdropFilter="blur(8px)"
          >
            <VStack gap="4" textAlign="center">
              <Check className="h-12 w-12" />
              <Text textStyle="lg" fontWeight="semibold">
                Video Completed
              </Text>
              <HStack justify="center" gap="2">
                <Button
                  variant="outline"
                  colorPalette="secondary"
                  onClick={() => setIsRewatching(true)}
                >
                  Watch Again
                </Button>
                {onNext && (
                  <Button onClick={onNext} colorPalette="primary">
                    <HStack gap="2">
                      <Text as="span">Next Video</Text>
                      <ArrowRight className="h-4 w-4" />
                    </HStack>
                  </Button>
                )}
              </HStack>
            </VStack>
          </Box>
        )}

        <YoutubeIframe
          position="absolute"
          inset="0"
          width="full"
          height="full"
          src={`https://www.youtube.com/embed/${video.youtubeId}?enablejsapi=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </Box>
    </VStack>
  );
}
