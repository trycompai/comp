'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  PentestAgentEvent,
  PentestIssue,
  PentestRun,
} from '@/lib/security/penetration-tests-client';
import { formatReportDate } from '../lib';
import { AgentActivityLog } from './AgentActivityLog';
import { AgentProgressGrid } from './AgentProgressGrid';
import { FindingsTable } from './FindingsTable';
import { SevTally } from './SevTally';
import { StatusPill } from './StatusPill';
import { tallySeverities } from './severity';

interface RunningDetailProps {
  run: PentestRun;
  issues: PentestIssue[];
  events: PentestAgentEvent[];
  onOpenFinding: (issue: PentestIssue) => void;
}

export function RunningDetail({
  run,
  issues,
  events,
  onOpenFinding,
}: RunningDetailProps) {
  const counts = tallySeverities(issues);
  const highlighted = useNewFindingHighlights(issues);

  const progress = run.progress;
  const completedAgents = progress?.completedAgents ?? 0;
  const totalAgents = progress?.totalAgents ?? 22;
  const elapsedMs = progress?.elapsedMs ?? 0;
  const elapsedLabel = formatElapsed(elapsedMs);

  return (
    <div className="min-h-0 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-8 space-y-6">
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <StatusPill status={run.status} />
            <span className="font-mono text-xs text-muted-foreground">
              {run.id}
            </span>
          </div>
          <h1 className="truncate text-[26px] font-medium tracking-[-0.02em]">
            {run.targetUrl}
          </h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>Started {formatReportDate(run.createdAt)}</span>
            <span>Last update {formatReportDate(run.updatedAt)}</span>
            <span>Elapsed {elapsedLabel}</span>
            {run.repoUrl ? <span>Repo: {run.repoUrl}</span> : null}
          </div>
        </header>

        <section className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Agents · {completedAgents}/{totalAgents} complete
          </h2>
          <AgentProgressGrid total={totalAgents} done={completedAgents} />
        </section>

        <section className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Live severity tally
          </h2>
          <SevTally counts={counts} size="mid" />
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Findings ({issues.length})
            </h2>
            <span className="text-xs text-muted-foreground">
              New findings appear here as agents discover them
            </span>
          </div>
          <FindingsTable
            issues={issues}
            onRowClick={onOpenFinding}
            highlightedIds={highlighted}
            emptyState={
              <div className="rounded-[var(--radius)] border border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">
                Scanning. Findings will appear here as they are discovered.
              </div>
            }
          />
        </section>

        <AgentActivityLog events={events} />
      </div>
    </div>
  );
}

function formatElapsed(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/**
 * Tracks which issue IDs have arrived since the last render so the findings
 * table can flash them with the severity tint. Issues that were already
 * there on mount don't flash.
 */
function useNewFindingHighlights(issues: PentestIssue[]): Set<string> {
  const seenRef = useRef<Set<string>>(new Set(issues.map((i) => i.id)));
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newlyLanded: string[] = [];
    for (const issue of issues) {
      if (!seenRef.current.has(issue.id)) {
        seenRef.current.add(issue.id);
        newlyLanded.push(issue.id);
      }
    }
    if (newlyLanded.length === 0) return;

    setHighlighted((prev) => {
      const next = new Set(prev);
      for (const id of newlyLanded) next.add(id);
      return next;
    });

    const timer = window.setTimeout(() => {
      setHighlighted((prev) => {
        const next = new Set(prev);
        for (const id of newlyLanded) next.delete(id);
        return next;
      });
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [issues]);

  return highlighted;
}
