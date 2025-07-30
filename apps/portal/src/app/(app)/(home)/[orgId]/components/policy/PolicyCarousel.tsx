'use client';

import { Button } from '@comp/ui/button';
import type { Member, Policy } from '@db';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { markPolicyAsCompleted } from '../../../actions/markPolicyAsCompleted';
import { PolicyCard } from './PolicyCard';

interface PolicyCarouselProps {
  policies: Policy[];
  member: Member;
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
}

export function PolicyCarousel({
  policies,
  member,
  initialIndex = 0,
  onIndexChange,
}: PolicyCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const onCompletePolicy = useAction(markPolicyAsCompleted, {
    onSuccess: () => {
      toast.success('Policy completed');
    },
    onError: () => {
      toast.error('Failed to complete policy');
    },
  });

  const scrollToIndex = (index: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const itemWidth = container.clientWidth;
    container.scrollTo({
      left: index * itemWidth,
      behavior: 'instant',
    });
    setCurrentIndex(index);
    onIndexChange?.(index);
  };

  useEffect(() => {
    // Scroll to initial index without animation on mount
    if (scrollContainerRef.current && initialIndex > 0) {
      const container = scrollContainerRef.current;
      const itemWidth = container.clientWidth;
      container.scrollTo({
        left: initialIndex * itemWidth,
        behavior: 'instant',
      });
    }
  }, [initialIndex]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollPosition = container.scrollLeft;
    const itemWidth = container.clientWidth;
    const newIndex = Math.round(scrollPosition / itemWidth);
    setCurrentIndex(newIndex);
    onIndexChange?.(newIndex);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < policies.length - 1) {
      scrollToIndex(currentIndex + 1);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div
        ref={scrollContainerRef}
        className="flex snap-x snap-mandatory overflow-x-hidden scroll-smooth"
        onScroll={handleScroll}
      >
        {policies.map((policy) => (
          <div key={policy.id} className="w-full flex-none snap-center">
            <PolicyCard
              policy={policy}
              onNext={handleNext}
              onComplete={() => onCompletePolicy.execute({ policyId: policy.id })}
              onClick={() => handleNext()}
              member={member}
              isLastPolicy={currentIndex === policies.length - 1}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-muted-foreground text-sm">
          Policy {currentIndex + 1} of {policies.length}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={currentIndex === policies.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
