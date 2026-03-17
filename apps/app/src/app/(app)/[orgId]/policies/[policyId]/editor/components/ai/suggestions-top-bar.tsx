import { useCallback, useEffect } from 'react';
import { Button } from '@trycompai/design-system';
import {
  ChevronDown,
  ChevronUp,
  Close,
} from '@trycompai/design-system/icons';

interface SuggestionsTopBarProps {
  activeCount: number;
  totalCount: number;
  currentIndex: number;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDismiss: () => void;
}

export function SuggestionsTopBar({
  activeCount,
  totalCount,
  currentIndex,
  onAcceptAll,
  onRejectAll,
  onPrev,
  onNext,
  onDismiss,
}: SuggestionsTopBarProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'F7' || ((e.metaKey || e.ctrlKey) && e.key === ']')) {
        e.preventDefault();
        onNext();
        return;
      }
      if (
        (e.shiftKey && e.key === 'F7') ||
        ((e.metaKey || e.ctrlKey) && e.key === '[')
      ) {
        e.preventDefault();
        onPrev();
        return;
      }
    },
    [onNext, onPrev],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="suggestions-top-bar">
      {/* Left: navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onPrev}
          disabled={activeCount === 0}
          title="Previous change (Shift+F7)"
        >
          <ChevronUp size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onNext}
          disabled={activeCount === 0}
          title="Next change (F7)"
        >
          <ChevronDown size={16} />
        </Button>
        <span className="ml-1 text-sm text-muted-foreground tabular-nums">
          {activeCount > 0 ? `${currentIndex + 1}/${activeCount}` : '0/0'}
          {activeCount !== totalCount && (
            <span className="ml-1 text-xs">
              ({totalCount - activeCount} resolved)
            </span>
          )}
        </span>
      </div>

      {/* Right: bulk actions + dismiss */}
      <div className="flex items-center gap-1">
        <Button
          variant="default"
          size="sm"
          onClick={onAcceptAll}
          disabled={activeCount === 0}
        >
          Accept all
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRejectAll}
          disabled={activeCount === 0}
        >
          Reject all
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDismiss}
          title="Dismiss all suggestions"
        >
          <Close size={14} />
        </Button>
      </div>
    </div>
  );
}
