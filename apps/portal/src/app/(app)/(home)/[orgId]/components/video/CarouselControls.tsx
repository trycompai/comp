import { Button } from '@trycompai/design-system';
import { ChevronLeft, ChevronRight } from '@trycompai/design-system/icons';

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
        size="icon"
        onClick={onPrevious}
        disabled={isFirstVideo}
        aria-label="Previous video"
      >
        <ChevronLeft size={16} />
      </Button>

      <div className="text-muted-foreground text-sm">
        {currentIndex + 1} of {total}
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={onNext}
        disabled={!onNext}
        aria-label="Next video"
      >
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
