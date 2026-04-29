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
  // Pass the run id so the highlights hook resets its `seenRef` when
  // the user switches to a different scan — otherwise IDs from the
  // previous run linger and ALL of the new run's findings flash as
  // "newly arrived" on first render.
  const highlighted = useNewFindingHighlights(run.id, issues);

  const progress = run.progress;
  const completedAgents = progress?.completedAgents ?? 0;
  const totalAgents = progress?.totalAgents ?? 22;
  // Compute elapsed client-side from `createdAt` rather than trusting
  // `progress.elapsedMs` from Maced — that field isn't always populated,
  // which would otherwise show "0m" hours into a real scan. Updates on
  // each SWR poll (~4s cadence), which is fine granularity for a
  // multi-hour run.
  const startedMs = new Date(run.createdAt).getTime();
  const elapsedMs =
    Number.isFinite(startedMs) && startedMs > 0
      ? Math.max(0, Date.now() - startedMs)
      : 0;
  const elapsedLabel = formatElapsed(elapsedMs);

  return (
    <div className="min-h-0 overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
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
            {run.updatedAt && run.updatedAt !== run.createdAt ? (
              <span>Last update {formatReportDate(run.updatedAt)}</span>
            ) : null}
            {run.repoUrl ? <span>Repo: {run.repoUrl}</span> : null}
          </div>
        </header>

        <section className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Scan progress
          </h2>
          <AgentProgressGrid total={totalAgents} done={completedAgents} />
          <div className="font-mono text-[11px] text-muted-foreground">
            Running · {elapsedLabel} elapsed
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Live severity tally
          </h2>
          <SevTally counts={counts} size="mid" />
        </section>

        <section className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Findings ({issues.length})
          </h2>
          <FindingsTable
            issues={issues}
            onRowClick={onOpenFinding}
            highlightedIds={highlighted}
            emptyState={
              <div className="rounded-[var(--radius)] border border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">
                Scanning. New findings will appear here as agents discover them.
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
 *
 * Keyed on `runId` — when the user navigates between scans, the seen-set
 * resets so we don't carry over IDs from the previous run.
 */
function useNewFindingHighlights(
  runId: string,
  issues: PentestIssue[],
): Set<string> {
  const seenRef = useRef<Set<string>>(new Set());
  const lastRunIdRef = useRef<string | null>(null);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  // On run change: prime `seenRef` with the issues already present so
  // they don't all flash as newly-arrived. Bypass the next "newly
  // landed" pass entirely for this run change.
  if (lastRunIdRef.current !== runId) {
    seenRef.current = new Set(issues.map((i) => i.id));
    lastRunIdRef.current = runId;
  }

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

    // Schedule per-batch removal independently — fire and forget.
    // Don't `clearTimeout` on cleanup: if `issues` changes in <2s
    // (very common during a live scan polling at 3s), the cleanup
    // would cancel the pending removal and the highlight class would
    // stick to those rows forever. Each scheduled removal targets only
    // the IDs from its batch, so multiple in-flight timers can't
    // step on each other.
    window.setTimeout(() => {
      setHighlighted((prev) => {
        const next = new Set(prev);
        for (const id of newlyLanded) next.delete(id);
        return next;
      });
    }, 2000);
  }, [issues]);

  return highlighted;
}
