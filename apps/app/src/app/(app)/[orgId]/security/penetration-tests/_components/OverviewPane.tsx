'use client';

import { Button } from '@trycompai/design-system';
import { Add, ArrowRight } from '@trycompai/design-system/icons';
import { useRouter } from 'next/navigation';
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
import { StatusPill } from './StatusPill';
import { isRunInProgress } from './severity';

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
 * Right pane shown when no scan is selected. Three real states:
 *
 *   - 0 completed, 0 in-progress → onboarding card with primary CTA
 *   - 0 completed, 1+ in-progress → in-progress card surfacing the running
 *     scan(s); avoids the "No scans yet" lie when the sidebar already
 *     shows a running scan.
 *   - 1+ completed → posture overview: real counts, recent scans,
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
    // If there are no completed runs but a scan is currently running, surface
    // it instead of the "No scans yet" onboarding — that headline contradicts
    // the sidebar (which already shows the running scan) and was the source
    // of a customer report: "I left, came back, it says no scans yet instead
    // of just showing the latest one which had already started."
    const inProgress = runs.filter((r) => isRunInProgress(r.status));
    if (inProgress.length > 0) {
      return (
        <InProgressState
          orgId={orgId}
          runs={inProgress}
          onCreateClick={onCreateClick}
          canCreate={canCreate}
        />
      );
    }
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

interface InProgressStateProps {
  orgId: string;
  runs: PentestRun[];
  onCreateClick: () => void;
  canCreate: boolean;
}

/**
 * Shown on `/pentests` when the org has only in-progress scans (no
 * completed history yet). Lists the running scans with a click-to-view
 * card so the user lands on something that matches the sidebar instead
 * of the onboarding empty state.
 */
function InProgressState({
  orgId,
  runs,
  onCreateClick,
  canCreate,
}: InProgressStateProps) {
  const router = useRouter();
  const sorted = [...runs].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const headline =
    sorted.length === 1 ? 'Scan in progress' : `${sorted.length} scans in progress`;

  return (
    <div className="flex h-full items-center justify-center px-4 py-10 md:px-8 md:py-12">
      <div className="w-full max-w-[640px]">
        <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          Penetration tests · Overview
        </div>
        <h1 className="mt-3 text-[24px] font-medium tracking-[-0.01em]">
          {headline}
        </h1>
        <p className="mt-2 max-w-[480px] text-sm text-muted-foreground">
          Findings stream in as agents discover them. You don't need to keep
          this page open — open the run any time to see live progress.
        </p>

        <ul className="mt-6 space-y-2">
          {sorted.slice(0, 3).map((run) => (
            <li key={run.id}>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/${orgId}/security/penetration-tests/${encodeURIComponent(run.id)}`,
                  )
                }
                className="flex w-full items-center justify-between gap-4 rounded-[var(--radius)] border border-border bg-card p-4 text-left transition hover:border-foreground/20 hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <StatusPill status={run.status} />
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {toShortRunId(run.id)}
                    </span>
                  </div>
                  <div className="truncate font-mono text-sm">
                    {targetHost(run.targetUrl)}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>

        {sorted.length > 3 ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            +{sorted.length - 3} more in the sidebar.
          </p>
        ) : null}

        <div className="mt-6">
          <Button variant="outline" onClick={onCreateClick} disabled={!canCreate}>
            <Add className="h-3.5 w-3.5" />
            New scan
          </Button>
        </div>
      </div>
    </div>
  );
}

function toShortRunId(fullId: string): string {
  const tail = fullId.replace(/[^0-9]/g, '').slice(-4);
  return tail ? `PT-${tail}` : fullId;
}

function targetHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
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
  // Coverage / avg-duration / stale stats are completed-only on purpose:
  // a target whose only scans are running or failed isn't actually
  // "covered," a running scan has no real duration yet, and a failed
  // scan shouldn't reset the staleness clock.
  //
  // "Recent scans" is the exception — that's an activity feed, not a
  // success metric, so it uses the full `runs` list. Otherwise a user
  // with completed history but a fresh running scan would see the
  // running one in the sidebar but NOT here, which contradicts the
  // sidebar and hides the live scan from the overview.
  const targets = uniqueTargets(completed);
  const lastScan = mostRecent(completed);
  const avgDuration = avgDurationMs(completed);
  const scansLast30d = countWithin(completed, 30 * 24 * 60 * 60 * 1000);
  const recentScans = sortByUpdatedDesc(runs).slice(0, 6);
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
