import { Button, HStack, Text } from '@trycompai/ui-v2';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselControlsProps {
  currentIndex: number;
  total: number;
  onPrevious: () => void;
  onNext?: () => void;
}

export function CarouselControls({
  currentIndex,
  total,
  onPrevious,
  onNext,
}: CarouselControlsProps) {
  const isFirstVideo = currentIndex === 0;

  return (
    <HStack justify="space-between">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrevious}
        disabled={isFirstVideo}
        aria-label="Previous video"
        colorPalette="secondary"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Text fontSize="sm" color="fg.muted">
        {currentIndex + 1} of {total}
      </Text>

      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={!onNext}
        aria-label="Next video"
        colorPalette="secondary"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </HStack>
  );
}
