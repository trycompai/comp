import { useCallback, useEffect } from 'react';
import { Button } from '@trycompai/design-system';
import {
  Checkmark,
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
  onAcceptCurrent: () => void;
  onRejectCurrent: () => void;
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
  onAcceptCurrent,
  onRejectCurrent,
  onPrev,
  onNext,
  onDismiss,
}: SuggestionsTopBarProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + Enter = accept current
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        onAcceptCurrent();
        return;
      }
      // Cmd/Ctrl + Shift + Backspace = reject current
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Backspace') {
        e.preventDefault();
        onRejectCurrent();
        return;
      }
      // F7 or Cmd+] = next change
      if (e.key === 'F7' || ((e.metaKey || e.ctrlKey) && e.key === ']')) {
        e.preventDefault();
        onNext();
        return;
      }
      // Shift+F7 or Cmd+[ = prev change
      if (
        (e.shiftKey && e.key === 'F7') ||
        ((e.metaKey || e.ctrlKey) && e.key === '[')
      ) {
        e.preventDefault();
        onPrev();
        return;
      }
    },
    [onAcceptCurrent, onRejectCurrent, onNext, onPrev],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-1.5 shadow-sm">
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

      {/* Center: per-change actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAcceptCurrent}
          disabled={activeCount === 0}
          title="Accept change (⌘⇧↩)"
        >
          <Checkmark size={14} />
          Accept
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRejectCurrent}
          disabled={activeCount === 0}
          title="Reject change (⌘⇧⌫)"
        >
          <Close size={14} />
          Reject
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onAcceptAll}
          disabled={activeCount === 0}
        >
          Accept all
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRejectAll}
          disabled={activeCount === 0}
        >
          Reject all
        </Button>
      </div>

      {/* Right: dismiss */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDismiss}
        title="Dismiss all suggestions"
      >
        <Close size={14} />
      </Button>
    </div>
  );
}
