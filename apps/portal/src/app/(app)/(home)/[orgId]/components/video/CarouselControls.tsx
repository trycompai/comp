import { Button } from '@trycompai/design-system';
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
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        size="icon-sm"
        onClick={onPrevious}
        disabled={isFirstVideo}
        aria-label="Previous video"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <span className="text-sm text-muted-foreground">
        {currentIndex + 1} of {total}
      </span>

      <Button
        variant="outline"
        size="icon-sm"
        onClick={onNext}
        disabled={!onNext}
        aria-label="Next video"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
