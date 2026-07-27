'use client';

import { useState } from 'react';
import type { BrowserAutomationRun } from '../../hooks/types';
import { RunStepLedger } from './RunStepLedger';

interface RunHistoryProps {
  runs: BrowserAutomationRun[];
}

const MAX_CHIPS = 8;

function dotColor(run: BrowserAutomationRun): string {
  if (run.status === 'blocked') return 'var(--warning)';
  if (run.status === 'failed' || run.evaluationStatus === 'fail') return 'var(--destructive)';
  return 'var(--success)';
}

function shortDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function duration(run: BrowserAutomationRun): string | null {
  if (!run.completedAt) return null;
  const ms = new Date(run.completedAt).getTime() - new Date(run.createdAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, '0')}s`;
}

/**
 * Run history (designer option 3B): the latest run is flattened — its step
 * ledger with every screenshot inline, nothing to open. Older runs are a
 * one-line "Earlier" strip of chips; clicking one shows it in the same place.
 */
export function RunHistory({ runs }: RunHistoryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (runs.length === 0) {
    return <p className="py-2 text-center text-xs text-muted-foreground">No runs yet</p>;
  }

  const selected = runs.find((run) => run.id === selectedId) ?? runs[0];
  const older = runs.filter((run) => run.id !== selected.id);
  const chips = showAll ? older : older.slice(0, MAX_CHIPS);
  const dur = duration(selected);

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
        <span className="font-mono">{shortDateTime(selected.createdAt)}</span>
        {dur && (
          <>
            <span aria-hidden>·</span>
            <span className="font-mono">{dur}</span>
          </>
        )}
      </div>

      <RunStepLedger run={selected} flat />

      {older.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Earlier
          </span>
          {chips.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => setSelectedId(run.id)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor(run) }} />
              <span className="font-mono">{shortDateTime(run.createdAt)}</span>
            </button>
          ))}
          {older.length > MAX_CHIPS && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="ml-auto text-[11px] text-primary hover:underline"
            >
              {showAll ? 'Show fewer' : `View all ${runs.length} runs`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
