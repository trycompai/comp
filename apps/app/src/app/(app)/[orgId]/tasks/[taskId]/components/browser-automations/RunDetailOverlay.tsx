'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@trycompai/design-system';
import { Play } from '@trycompai/design-system/icons';
import type { RunSummary } from './RunHistoryStrip';
import { RunStepLedger } from './RunStepLedger';

interface RunDetailOverlayProps {
  selected: RunSummary | null;
  onClose: () => void;
  onRerun?: (automationId: string) => void;
}

function runVerdict(run: {
  status?: string | null;
  evaluationStatus?: 'pass' | 'fail' | null;
}): { label: string; bg: string; fg: string } {
  if (run.status === 'blocked') {
    return {
      label: 'Blocked',
      bg: 'color-mix(in oklab, var(--warning) 20%, transparent)',
      fg: 'oklch(0.5 0.14 85)',
    };
  }
  if (run.status === 'failed' || run.evaluationStatus === 'fail') {
    return {
      label: run.evaluationStatus === 'fail' ? 'Fail' : 'Failed',
      bg: 'color-mix(in oklab, var(--destructive) 12%, transparent)',
      fg: 'var(--destructive)',
    };
  }
  if (run.evaluationStatus === 'pass') {
    return {
      label: 'Pass',
      bg: 'color-mix(in oklab, var(--success) 15%, transparent)',
      fg: 'var(--success)',
    };
  }
  return { label: 'Completed', bg: 'var(--muted)', fg: 'var(--foreground)' };
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Full detail for a run: the C3 per-step ledger (proof + context) + timing. */
export function RunDetailOverlay({ selected, onClose, onRerun }: RunDetailOverlayProps) {
  return (
    <Dialog open={!!selected} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="3xl">
        {selected && (
          <RunDetailBody
            key={selected.run.id}
            summary={selected}
            onClose={onClose}
            onRerun={onRerun}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RunDetailBody({
  summary,
  onClose,
  onRerun,
}: {
  summary: RunSummary;
  onClose: () => void;
  onRerun?: (automationId: string) => void;
}) {
  const { run, automationId, automationName } = summary;
  const badge = runVerdict(run);

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          <span className="flex items-center gap-2.5">
            <span className="min-w-0 flex-1 truncate">
              {automationName} · {formatDateTime(run.createdAt)}
            </span>
            <span
              className="flex-none rounded-sm px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em]"
              style={{ backgroundColor: badge.bg, color: badge.fg }}
            >
              {badge.label}
            </span>
          </span>
        </DialogTitle>
      </DialogHeader>

      <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto py-2">
        <RunStepLedger run={run} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span>Started {formatDateTime(run.createdAt)}</span>
          {run.completedAt && <span>Finished {formatDateTime(run.completedAt)}</span>}
          {onRerun && (
            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                iconLeft={<Play size={12} />}
                onClick={() => {
                  onRerun(automationId);
                  onClose();
                }}
              >
                Re-run now
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
