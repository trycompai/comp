'use client';

import { useEffect, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { CarouselControls } from './CarouselControls';
import { PolicyImagePreview } from './PolicyImagePreview';

interface PolicyImagePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[];
}

export function PolicyImagePreviewModal({ open, images, onOpenChange }: PolicyImagePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
    }
  }, [open, images.length]);

  const hasImages = images.length > 0;

  const goPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preview</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!hasImages && <p className="text-sm text-muted-foreground">No images to display.</p>}

          {hasImages && (
            <>
              <PolicyImagePreview image={images[currentIndex]} />
              <CarouselControls
                currentIndex={currentIndex}
                total={images.length}
                onPrevious={goPrevious}
                onNext={goNext}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}