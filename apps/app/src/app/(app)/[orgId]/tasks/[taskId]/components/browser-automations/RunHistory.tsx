'use client';

import { useState } from 'react';
import type { BrowserAutomationRun } from '../../hooks/types';
import { RunItem } from './RunItem';

interface RunHistoryProps {
  runs: BrowserAutomationRun[];
}

const MAX_RUNS = 5;

/** Run history as a compact ledger of run rows (designer option 1A). */
export function RunHistory({ runs }: RunHistoryProps) {
  const [showAll, setShowAll] = useState(false);

  if (runs.length === 0) {
    return <p className="py-2 text-center text-xs text-muted-foreground">No runs yet</p>;
  }

  const display = showAll ? runs : runs.slice(0, MAX_RUNS);

  return (
    <div className="overflow-hidden rounded-md border border-border">
      {display.map((run, index) => (
        <RunItem key={run.id} run={run} isLatest={index === 0} />
      ))}
      {runs.length > MAX_RUNS && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="w-full border-t border-border py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
        >
          {showAll ? 'Show less' : `View all ${runs.length} runs`}
        </button>
      )}
    </div>
  );
}
