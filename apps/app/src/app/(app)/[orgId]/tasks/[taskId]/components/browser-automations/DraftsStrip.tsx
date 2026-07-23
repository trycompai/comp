'use client';

import { Button } from '@trycompai/design-system';
import { Play, TrashCan } from '@trycompai/design-system/icons';
import type { BrowserAutomationDraft } from '../../hooks/types';

interface DraftsStripProps {
  drafts: BrowserAutomationDraft[];
  onContinue: (draft: BrowserAutomationDraft) => void;
  onDelete: (draft: BrowserAutomationDraft) => void;
}

/** Unsaved automations, pinned in a dashed strip above the list (design 4a). */
export function DraftsStrip({ drafts, onContinue, onDelete }: DraftsStripProps) {
  if (drafts.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-dashed border-border bg-muted/30 p-3">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Drafts — not saved yet
      </div>
      <div className="flex flex-col gap-2">
        {drafts.map((draft) => {
          const count = draft.steps?.length ?? 0;
          return (
            <div
              key={draft.id}
              className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">
                {draft.name?.trim() || 'Untitled draft'}
              </span>
              <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                {count} {count === 1 ? 'step' : 'steps'}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onContinue(draft)}
                iconLeft={<Play size={12} />}
              >
                Continue
              </Button>
              <button
                type="button"
                aria-label="Delete draft"
                onClick={() => onDelete(draft)}
                className="grid h-7 w-7 flex-none cursor-pointer place-items-center rounded-sm text-muted-foreground hover:text-destructive"
              >
                <TrashCan size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
