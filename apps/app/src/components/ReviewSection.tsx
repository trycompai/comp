'use client';

import { ReviewWidget } from './review-widget';

interface ReviewSectionProps {
  rating?: number;
  reviewCount?: number;
  className?: string;
}

export function ReviewSection({
  rating = 4.7,
  reviewCount = 100,
  className = '',
}: ReviewSectionProps) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* Review Widget */}
      <ReviewWidget rating={rating} reviewCount={reviewCount} />

      {/* Trust Signals - Simplified without icons */}
      <div className="text-[10px] text-muted-foreground/70 text-center">
        100% money back guarantee • Cancel anytime
      </div>
    </div>
  );
}
