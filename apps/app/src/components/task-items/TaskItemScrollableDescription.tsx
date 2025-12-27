import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { TaskItemDescriptionView } from './TaskItemDescriptionView';

interface TaskItemScrollableDescriptionProps {
  description: string | null | undefined;
  /**
   * Tailwind max-height class (e.g. "max-h-80"). When provided, the description
   * becomes scrollable and shows a subtle affordance if content overflows.
   */
  maxHeightClass?: string;
}

export function TaskItemScrollableDescription({
  description,
  maxHeightClass,
}: TaskItemScrollableDescriptionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  const shouldConstrain = Boolean(maxHeightClass);

  const handleMeasure = () => {
    const el = containerRef.current;
    if (!el) return;
    // Only show overflow hint if there's significant overflow (more than 20px)
    // This prevents showing the hint for tiny amounts of overflow due to padding/margins
    const overflowAmount = el.scrollHeight - el.clientHeight;
    const overflowing = overflowAmount > 20;
    setIsOverflowing(overflowing);
  };

  useEffect(() => {
    if (!shouldConstrain) return;
    handleMeasure();

    const el = containerRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(() => {
      handleMeasure();
    });
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldConstrain, description]);

  const hintText = useMemo(() => {
    if (!isOverflowing) return null;
    if (hasScrolled) return null;
    return 'Scroll to read more';
  }, [hasScrolled, isOverflowing]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onScroll={(e) => {
          const target = e.currentTarget;
          if (target.scrollTop > 8) {
            setHasScrolled(true);
          }
        }}
        className={cn(shouldConstrain && maxHeightClass, shouldConstrain && 'overflow-y-auto pr-2')}
      >
        <TaskItemDescriptionView description={description} />
      </div>

      {isOverflowing && (
        <>
          {/* Bottom fade to indicate more content */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent"
          />

          {/* Hint label (only until user scrolls) */}
          {hintText && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center"
            >
              <div className="rounded-full bg-background/80 px-2 py-0.5 text-xs text-muted-foreground shadow-sm ring-1 ring-border">
                {hintText}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


