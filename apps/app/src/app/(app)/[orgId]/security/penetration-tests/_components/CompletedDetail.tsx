'use client';

import { Button } from '@trycompai/design-system';
import {
  Document,
  Download,
  Renew,
} from '@trycompai/design-system/icons';
import type {
  PentestAgentEvent,
  PentestIssue,
  PentestRun,
} from '@/lib/security/penetration-tests-client';
import { formatReportDate } from '../lib';
import { AgentActivityLog } from './AgentActivityLog';
import { CleanReportLayout } from './CleanReportLayout';
import { FindingsTable } from './FindingsTable';
import { SevTally } from './SevTally';
import { StatusPill } from './StatusPill';
import { tallySeverities } from './severity';

interface CompletedDetailProps {
  run: PentestRun;
  issues: PentestIssue[];
  events: PentestAgentEvent[];
  onOpenFinding: (issue: PentestIssue) => void;
  onDownloadMarkdown: () => void;
  onDownloadPdf: () => void;
  onReRun?: () => void;
}

export function CompletedDetail({
  run,
  issues,
  events,
  onOpenFinding,
  onDownloadMarkdown,
  onDownloadPdf,
  onReRun,
}: CompletedDetailProps) {
  const counts = tallySeverities(issues);
  const isClean = issues.length === 0;

  return (
    <div className="min-h-0 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-8 space-y-6">
        <header className="space-y-3 pb-3">
          <div className="flex items-center gap-3">
            <StatusPill status="completed" findingCount={issues.length} />
            <span className="font-mono text-xs text-muted-foreground">
              {run.id}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="truncate text-[26px] font-medium tracking-[-0.02em]">
              {run.targetUrl}
            </h1>
            <div className="flex items-center gap-2">
              {/* Markdown/PDF only show in the header when there are
                  findings — for clean runs the "Attach to audit" CTA in
                  CleanReportLayout already surfaces them as the primary
                  action, so a second pair here is duplicative. */}
              {!isClean ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDownloadMarkdown}
                  >
                    <Document className="h-3.5 w-3.5" />
                    Markdown
                  </Button>
                  <Button variant="outline" size="sm" onClick={onDownloadPdf}>
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </Button>
                </>
              ) : null}
              {onReRun ? (
                <Button size="sm" onClick={onReRun}>
                  <Renew className="h-3.5 w-3.5" />
                  Re-run scan
                </Button>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>Started {formatReportDate(run.createdAt)}</span>
            {/* Suppress "Last update" when it matches "Started". Maced
                doesn't always bump `updatedAt` on completion, so showing
                two identical timestamps is just noise. We'll re-show this
                line once we either (a) Maced fixes the bug, or (b) we
                persist completion time from the webhook payload. */}
            {run.updatedAt && run.updatedAt !== run.createdAt ? (
              <span>Last update {formatReportDate(run.updatedAt)}</span>
            ) : null}
            {run.repoUrl ? <span>Repo: {run.repoUrl}</span> : null}
            {run.testMode ? (
              <span className="rounded bg-muted px-1.5 py-0.5 font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Test mode
              </span>
            ) : null}
          </div>
        </header>

        {isClean ? (
          <CleanReportLayout
            run={run}
            events={events}
            onDownloadMarkdown={onDownloadMarkdown}
            onDownloadPdf={onDownloadPdf}
            onReRun={onReRun}
          />
        ) : (
          <>
            <SevTally counts={counts} size="hero" />
            <section className="space-y-2">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Findings ({issues.length})
              </h2>
              <FindingsTable issues={issues} onRowClick={onOpenFinding} />
            </section>
          </>
        )}

        <AgentActivityLog events={events} />
      </div>
    </div>
  );
}
