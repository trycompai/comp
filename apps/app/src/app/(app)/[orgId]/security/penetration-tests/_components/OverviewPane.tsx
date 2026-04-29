'use client';

import { Button } from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import type { PentestRun } from '@/lib/security/penetration-tests-client';
import {
  LatestAssessment,
  RecentScansSection,
  StaleCoverageSection,
  avgDurationMs,
  cadenceLabel,
  computeStaleTargets,
  countWithin,
  formatDurationLabel,
  mostRecent,
  relativeTime,
  sortByUpdatedDesc,
  uniqueTargets,
} from './overview-internals';

interface OverviewPaneProps {
  orgId: string;
  runs: PentestRun[];
  onCreateClick: () => void;
  /** False when the org is out of pentest credits — disables the CTA. */
  canCreate: boolean;
  onDownloadMarkdown: (runId: string) => void;
  onDownloadPdf: (runId: string) => void;
}

/**
 * Right pane shown when no scan is selected. Two real states:
 *
 *   - 0 completed scans → onboarding card with primary CTA
 *   - 1+ completed scans → posture overview: real counts, recent scans,
 *     stale-coverage list. NO cross-scan severity aggregation, NO trend
 *     chart, NO "open findings" queue — those need per-run issue counts
 *     in the list endpoint (backend aggregation), which we don't have
 *     yet. Surfacing fabricated severity numbers in a posture dashboard
 *     would actively mislead in an audit context.
 */
export function OverviewPane({
  orgId,
  runs,
  onCreateClick,
  canCreate,
  onDownloadMarkdown,
  onDownloadPdf,
}: OverviewPaneProps) {
  const completed = runs.filter((r) => r.status === 'completed');

  if (completed.length === 0) {
    return <OnboardingState onCreateClick={onCreateClick} canCreate={canCreate} />;
  }

  return (
    <PostureOverview
      orgId={orgId}
      runs={runs}
      completed={completed}
      onCreateClick={onCreateClick}
      canCreate={canCreate}
      onDownloadMarkdown={onDownloadMarkdown}
      onDownloadPdf={onDownloadPdf}
    />
  );
}

function OnboardingState({
  onCreateClick,
  canCreate,
}: {
  onCreateClick: () => void;
  canCreate: boolean;
}) {
  return (
    <div className="flex h-full items-center justify-center px-4 py-10 md:px-8 md:py-12">
      <div className="w-full max-w-[560px]">
        <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          Penetration tests · Overview
        </div>
        <h1 className="mt-3 text-[24px] font-medium tracking-[-0.01em]">
          No scans yet. Start with your most exposed target.
        </h1>

        <ol className="mt-6 space-y-3">
          {[
            'Pick a target URL',
            'Agents run for ~1–3 hours',
            'Get a signed report — clean or with findings',
          ].map((step, i) => (
            <li key={step} className="flex items-baseline gap-3 text-[13px]">
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-7">
          <Button onClick={onCreateClick} disabled={!canCreate}>
            <Add className="h-3.5 w-3.5" />
            New scan
          </Button>
        </div>
      </div>
    </div>
  );
}

interface PostureOverviewProps {
  orgId: string;
  runs: PentestRun[];
  completed: PentestRun[];
  onCreateClick: () => void;
  canCreate: boolean;
  onDownloadMarkdown: (runId: string) => void;
  onDownloadPdf: (runId: string) => void;
}

function PostureOverview({
  orgId,
  runs,
  completed,
  onCreateClick,
  canCreate,
  onDownloadMarkdown,
  onDownloadPdf,
}: PostureOverviewProps) {
  // Coverage and stale-target stats use ONLY completed runs — a target
  // that's only ever had failed/cancelled scans isn't truly "covered,"
  // and a target whose latest scan failed shouldn't reset the staleness
  // clock. The full `runs` list is only used for the recent activity
  // sidebar elsewhere.
  const targets = uniqueTargets(completed);
  const lastScan = mostRecent(completed);
  const avgDuration = avgDurationMs(completed);
  const scansLast30d = countWithin(completed, 30 * 24 * 60 * 60 * 1000);
  const recentScans = sortByUpdatedDesc(completed).slice(0, 6);
  const staleTargets = computeStaleTargets(completed, targets);

  return (
    <div className="min-h-0 overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        <header className="flex flex-wrap items-end justify-between gap-3 pb-3">
          <div>
            <h1 className="text-[28px] font-medium tracking-[-0.02em]">
              Overview
            </h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              <span className="tabular-nums">{completed.length}</span>{' '}
              completed scan{completed.length === 1 ? '' : 's'}
              {' · '}
              <span className="tabular-nums">{targets.length}</span> target
              {targets.length === 1 ? '' : 's'} covered
              {lastScan
                ? ` · last sweep ${relativeTime(lastScan.updatedAt)}`
                : ''}
            </p>
          </div>
          <Button onClick={onCreateClick} disabled={!canCreate}>
            <Add className="h-3.5 w-3.5" />
            New scan
          </Button>
        </header>

        {lastScan ? (
          <LatestAssessment
            orgId={orgId}
            run={lastScan}
            onDownloadMarkdown={onDownloadMarkdown}
            onDownloadPdf={onDownloadPdf}
          />
        ) : null}

        <StatBand
          completed={completed.length}
          targets={targets.length}
          avgDurationMs={avgDuration}
          scansLast30d={scansLast30d}
        />

        <RecentScansSection orgId={orgId} runs={recentScans} />

        <StaleCoverageSection orgId={orgId} stale={staleTargets} />
      </div>
    </div>
  );
}


interface StatBandProps {
  completed: number;
  targets: number;
  avgDurationMs: number;
  scansLast30d: number;
}

function StatBand({
  completed,
  targets,
  avgDurationMs: avgMs,
  scansLast30d,
}: StatBandProps) {
  return (
    <section className="border-b-2 border-border pb-6">
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <StatCell
          label="Completed scans"
          value={String(completed)}
          subline="across all targets"
        />
        <StatCell
          label="Coverage"
          value={String(targets)}
          subline={`distinct target${targets === 1 ? '' : 's'} scanned`}
          divider
        />
        <StatCell
          label="Avg duration"
          value={avgMs > 0 ? formatDurationLabel(avgMs) : '—'}
          subline="per completed scan"
          divider
        />
        <StatCell
          label="Cadence"
          value={String(scansLast30d)}
          subline={cadenceLabel(scansLast30d)}
          divider
        />
      </div>
    </section>
  );
}

function StatCell({
  label,
  value,
  subline,
  divider,
}: {
  label: string;
  value: string;
  subline: string;
  divider?: boolean;
}) {
  return (
    <div className={divider ? 'md:border-l md:border-border md:pl-6' : ''}>
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-[40px] font-light leading-none tracking-[-0.03em] tabular-nums">
        {value}
      </div>
      <div className="mt-1.5 text-[11px] text-muted-foreground">{subline}</div>
    </div>
  );
}
