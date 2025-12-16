'use client';

import { useMemo, useState } from 'react';
import type { BrowserAutomationRun } from '../../hooks/types';
import { RunItem } from './RunItem';

interface RunHistoryProps {
  runs: BrowserAutomationRun[];
}

export function RunHistory({ runs }: RunHistoryProps) {
  const [showAll, setShowAll] = useState(false);
  const maxRuns = 5;

  const groupedRuns = useMemo(() => {
    const groups: Record<string, BrowserAutomationRun[]> = {};
    const displayRuns = showAll ? runs : runs.slice(0, maxRuns);

    displayRuns.forEach((run) => {
      const date = new Date(run.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(run);
    });

    return groups;
  }, [runs, showAll]);

  if (runs.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-2">No runs yet</p>;
  }

  const firstDateKey = Object.keys(groupedRuns)[0];

  return (
    <div className="space-y-4">
      {Object.entries(groupedRuns).map(([date, dateRuns]) => (
        <div key={date} className="space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {date}
          </p>
          <div className="space-y-2">
            {dateRuns.map((run, index) => (
              <RunItem
                key={run.id}
                run={run}
                isLatest={index === 0 && date === firstDateKey}
              />
            ))}
          </div>
        </div>
      ))}

      {runs.length > maxRuns && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          {showAll ? 'Show less' : `Show ${runs.length - maxRuns} more runs`}
        </button>
      )}
    </div>
  );
}


