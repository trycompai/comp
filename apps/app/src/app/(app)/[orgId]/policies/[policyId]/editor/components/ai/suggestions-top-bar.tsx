import { Button } from '@trycompai/design-system';
import { Checkmark, Close } from '@trycompai/design-system/icons';

interface SuggestionsTopBarProps {
  activeCount: number;
  totalCount: number;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onDismiss: () => void;
}

export function SuggestionsTopBar({
  activeCount,
  totalCount,
  onAcceptAll,
  onRejectAll,
  onDismiss,
}: SuggestionsTopBarProps) {
  const resolvedCount = totalCount - activeCount;

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-foreground">
          {activeCount} {activeCount === 1 ? 'change' : 'changes'}
        </span>
        {resolvedCount > 0 && (
          <span className="text-muted-foreground">
            ({resolvedCount} resolved)
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAcceptAll}
          disabled={activeCount === 0}
        >
          <Checkmark size={14} />
          Accept all
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRejectAll}
          disabled={activeCount === 0}
        >
          <Close size={14} />
          Reject all
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDismiss}
          title="Dismiss suggestions"
        >
          <Close size={14} />
        </Button>
      </div>
    </div>
  );
}
