'use client';

import { VendorLogo } from '@/components/VendorLogo';
import { Button } from '@trycompai/design-system';
import { Renew, TrashCan } from '@trycompai/design-system/icons';

interface ResumeConnectStripProps {
  /** Vendor host of the in-progress connection (derived from the saved URL). */
  host: string;
  onResume: () => void;
  onDiscard: () => void;
}

/**
 * A vendor connection the user started signing in to and left unfinished.
 * Surfaced as a resumable band (mirroring DraftsStrip) instead of hijacking the
 * whole panel, so the user can finish it OR ignore it and create a new
 * automation — the choice is theirs.
 */
export function ResumeConnectStrip({
  host,
  onResume,
  onDiscard,
}: ResumeConnectStripProps) {
  return (
    <div className="mb-4 rounded-lg border border-dashed border-border bg-muted/30 p-3">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Connection in progress
      </div>
      <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
        <VendorLogo hostname={host} size={20} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] text-foreground">
            Finish connecting to {host}
          </div>
          <div className="truncate text-[10.5px] text-muted-foreground">
            You started signing in but didn’t finish — resume it, or start a new one.
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onResume}
          iconLeft={<Renew size={12} />}
        >
          Resume
        </Button>
        <button
          type="button"
          aria-label="Discard in-progress connection"
          onClick={onDiscard}
          className="grid h-7 w-7 flex-none cursor-pointer place-items-center rounded-sm text-muted-foreground hover:text-destructive"
        >
          <TrashCan size={13} />
        </button>
      </div>
    </div>
  );
}
