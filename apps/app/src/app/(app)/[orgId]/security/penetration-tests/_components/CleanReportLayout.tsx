'use client';

import { Button } from '@trycompai/design-system';
import { Document, Download } from '@trycompai/design-system/icons';
import type {
  PentestAgentEvent,
  PentestRun,
} from '@/lib/security/penetration-tests-client';

interface CleanReportLayoutProps {
  run: PentestRun;
  events: PentestAgentEvent[];
  onDownloadMarkdown: () => void;
  onDownloadPdf: () => void;
  onReRun?: () => void;
}

/**
 * Audit-grade attestation layout for clean (zero findings) runs.
 *
 * Deliberately minimal. We only render what we can prove from `run`:
 *   - Target URL                ✅
 *   - Duration                  ✅  (updatedAt - createdAt)
 *   - Completion timestamp      ✅
 *   - Run id                    ✅
 *   - Severity counts (all 0)   ✅
 *
 * Re-add — only when the data is real, not when it looks plausible:
 *   - Per-run coverage matrix     (needs Maced endpoint listing the agents
 *                                  / categories that actually ran for THIS
 *                                  run; the standard-suite list is too
 *                                  weak a claim for audit attestation)
 *   - Agent grid                 (event stream is a partial subset of
 *                                  agents — "X / 22" reads like an
 *                                  incomplete scan even on success)
 *   - Streak history             (needs per-run issue counts in the list
 *                                  endpoint — backend aggregation)
 *   - sha256 attestation hash    (Maced doesn't expose one)
 *   - Scheduled-scan footer      (no scheduling feature exists)
 */
export function CleanReportLayout({
  run,
  events: _events,
  onDownloadMarkdown,
  onDownloadPdf,
  onReRun,
}: CleanReportLayoutProps) {
  const durationMs = computeDurationMs(run.createdAt, run.updatedAt);

  return (
    <div className="space-y-6">
      <HeroRow run={run} durationMs={durationMs} />

      <SeveritySummaryLine />

      <AttachToAuditCta
        onDownloadMarkdown={onDownloadMarkdown}
        onDownloadPdf={onDownloadPdf}
      />

      {onReRun ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Re-run for an updated attestation when your stack changes.
          </span>
          <button
            type="button"
            onClick={onReRun}
            className="font-medium text-foreground hover:underline"
          >
            Re-run scan →
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface HeroRowProps {
  run: PentestRun;
  durationMs: number;
}

function HeroRow({ run, durationMs }: HeroRowProps) {
  return (
    <section>
      {/* Single-column hero. Hierarchy comes from size (32px headline
          vs 11–12px metadata). The status pill + run id in the page
          header above already carry the "completed" cue and run-id
          reference, so a separate right-side attestation column was
          rendering only duplicates of those values once Maced's
          stale-`updatedAt` data forced us to hide the timestamp. */}
      <h2 className="text-[32px] font-normal leading-[1.1] tracking-[-0.02em]">
        No findings reported in this scan
      </h2>
      <p className="mt-2 truncate font-mono text-xs text-muted-foreground">
        <span className="text-foreground">{run.targetUrl}</span>
        {/* Maced doesn't always bump `updatedAt` on completion, so the
            computed duration can collapse to ~0 even for a 3-hour scan.
            Suppress the line entirely when that happens — better to say
            nothing than to print "< 1m" for a multi-hour assessment.
            The real duration is in the `pentest.completed` webhook
            payload; persisting it is a follow-up. */}
        {durationMs >= 60_000
          ? ` · Completed in ${formatDurationLabel(durationMs)}`
          : ''}
      </p>
      <p className="mt-3 max-w-prose text-xs text-muted-foreground">
        The downloaded report is the complete assessment record —
        always reference it for full context.
      </p>
    </section>
  );
}

function SeveritySummaryLine() {
  return (
    <div className="font-mono text-[11px] text-muted-foreground">
      0 critical · 0 high · 0 medium · 0 low · 0 info
    </div>
  );
}

interface AttachToAuditCtaProps {
  onDownloadMarkdown: () => void;
  onDownloadPdf: () => void;
}

function AttachToAuditCta({
  onDownloadMarkdown,
  onDownloadPdf,
}: AttachToAuditCtaProps) {
  return (
    <section className="rounded-[var(--radius)] bg-muted/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium">Attach to audit</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Timestamped, evidence-grade output for audits and security reviews.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Both buttons render as outline — they're parallel options
              (PDF for auditors, Markdown for tooling/automation), neither
              is universally primary. Treating one as filled would steer
              users toward a format that may not match their workflow. */}
          <Button variant="outline" onClick={onDownloadMarkdown}>
            <Document className="h-3.5 w-3.5" />
            Markdown
          </Button>
          <Button variant="outline" onClick={onDownloadPdf}>
            <Download className="h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      </div>
    </section>
  );
}

function computeDurationMs(start: string, end: string): number {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (
    !Number.isFinite(startMs) ||
    !Number.isFinite(endMs) ||
    endMs < startMs
  ) {
    return 0;
  }
  return endMs - startMs;
}

function formatDurationLabel(ms: number): string {
  const totalMin = Math.max(Math.round(ms / 60_000), 0);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (totalMin === 0) {
    return '< 1m';
  }
  return `${totalMin}m`;
}
