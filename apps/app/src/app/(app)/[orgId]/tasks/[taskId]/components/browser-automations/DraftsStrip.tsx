'use client';

import { VendorLogo } from '@/components/VendorLogo';
import { Button } from '@trycompai/design-system';
import { Play, TrashCan } from '@trycompai/design-system/icons';
import type { BrowserAuthProfile, BrowserAutomationDraft } from '../../hooks/types';

interface DraftsStripProps {
  drafts: BrowserAutomationDraft[];
  /** Used to resolve each draft step's connection to a vendor host. */
  profiles: BrowserAuthProfile[];
  onContinue: (draft: BrowserAutomationDraft) => void;
  onDelete: (draft: BrowserAutomationDraft) => void;
}

/** The distinct vendor hosts a draft's steps run on, in order. */
function vendorChain(draft: BrowserAutomationDraft, profiles: BrowserAuthProfile[]): string[] {
  const hosts: string[] = [];
  for (const step of draft.steps ?? []) {
    const host = step.profileId
      ? profiles.find((profile) => profile.id === step.profileId)?.hostname
      : undefined;
    if (host && !hosts.includes(host)) hosts.push(host);
  }
  return hosts;
}

/** Unsaved automations, pinned in a dashed strip above the list (design 4a). */
export function DraftsStrip({ drafts, profiles, onContinue, onDelete }: DraftsStripProps) {
  if (drafts.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-dashed border-border bg-muted/30 p-3">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Drafts — not saved yet
      </div>
      <div className="flex flex-col gap-2">
        {drafts.map((draft) => {
          const count = draft.steps?.length ?? 0;
          const chain = vendorChain(draft, profiles);
          return (
            <div
              key={draft.id}
              className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2"
            >
              {chain.length > 0 && (
                <span className="flex flex-none items-center gap-1">
                  {chain.map((host, index) => (
                    <span key={host} className="flex items-center gap-1" title={host}>
                      {index > 0 && (
                        <span className="text-[10px] text-muted-foreground/50">→</span>
                      )}
                      <VendorLogo hostname={host} size={20} />
                    </span>
                  ))}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] text-foreground">
                  {draft.name?.trim() || 'Untitled draft'}
                </div>
                {chain[0] && (
                  <div className="truncate font-mono text-[10.5px] text-muted-foreground">
                    {chain[0]}
                    {chain.length > 1 ? ` +${chain.length - 1}` : ''}
                  </div>
                )}
              </div>
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
