'use client';

import { Button } from '@trycompai/design-system';
import {
  ArrowRight,
  Checkmark,
  Document,
  Download,
} from '@trycompai/design-system/icons';
import { useRouter } from 'next/navigation';
import type { PentestRun } from '@/lib/security/penetration-tests-client';
import { formatReportDate } from '../lib';
import { StatusPill } from './StatusPill';

const STALE_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;

interface LatestAssessmentProps {
  orgId: string;
  run: PentestRun;
  onDownloadMarkdown: (runId: string) => void;
  onDownloadPdf: (runId: string) => void;
}

export function LatestAssessment({
  orgId,
  run,
  onDownloadMarkdown,
  onDownloadPdf,
}: LatestAssessmentProps) {
  const router = useRouter();
  const durationMs =
    new Date(run.updatedAt).getTime() - new Date(run.createdAt).getTime();
  return (
    <section className="rounded-[var(--radius)] border-2 border-border bg-card p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Latest assessment
      </div>
      <div className="mt-2 truncate text-base font-medium">{run.targetUrl}</div>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        {formatReportDate(run.updatedAt)}
        {durationMs > 0 ? ` · ran in ${formatDurationLabel(durationMs)}` : ''}
        {' · '}
        {run.id}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => onDownloadMarkdown(run.id)}>
          <Document className="h-3.5 w-3.5" />
          Download Markdown
        </Button>
        <Button variant="outline" onClick={() => onDownloadPdf(run.id)}>
          <Download className="h-3.5 w-3.5" />
          PDF
        </Button>
        <button
          type="button"
          onClick={() =>
            router.push(
              `/${orgId}/security/penetration-tests/${encodeURIComponent(run.id)}`,
            )
          }
          className="ml-auto font-mono text-[11px] text-muted-foreground hover:text-foreground"
        >
          View detail →
        </button>
      </div>
    </section>
  );
}

export function RecentScansSection({
  orgId,
  runs,
}: {
  orgId: string;
  runs: PentestRun[];
}) {
  const router = useRouter();
  if (runs.length === 0) return null;
  return (
    <section>
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
        Recent scans · {runs.length}
      </div>
      <div className="divide-y divide-border rounded-[var(--radius)] border border-border">
        {runs.map((run) => (
          <button
            key={run.id}
            type="button"
            onClick={() =>
              router.push(
                `/${orgId}/security/penetration-tests/${encodeURIComponent(run.id)}`,
              )
            }
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted"
          >
            <StatusPill status={run.status} />
            <span className="flex-1 truncate font-mono text-sm">
              {displayHost(run.targetUrl)}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {relativeTime(run.updatedAt)}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        ))}
      </div>
    </section>
  );
}

export function StaleCoverageSection({
  orgId,
  stale,
}: {
  orgId: string;
  stale: { targetUrl: string; lastScanAt: string | null }[];
}) {
  const router = useRouter();
  return (
    <section>
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
        Stale coverage · {stale.length}
      </div>
      {stale.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkmark
            className="h-3.5 w-3.5"
            style={{ color: 'var(--pt-sev-low-fg)' }}
          />
          All targets scanned in the last 14 days.
        </div>
      ) : (
        <div className="divide-y divide-border rounded-[var(--radius)] border border-border">
          {stale.map(({ targetUrl, lastScanAt }) => (
            <div
              key={targetUrl}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <span className="flex-1 truncate font-mono text-sm">
                {displayHost(targetUrl)}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {lastScanAt ? `last ${relativeTime(lastScanAt)}` : 'never'}
              </span>
              <button
                type="button"
                onClick={() =>
                  router.push(`/${orgId}/security/penetration-tests/new`)
                }
                className="rounded border border-border px-2 py-1 font-mono text-[11px] hover:bg-muted"
              >
                Scan now
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// --- helpers ---------------------------------------------------------------

export function uniqueTargets(runs: readonly PentestRun[]): string[] {
  return Array.from(new Set(runs.map((r) => r.targetUrl).filter(Boolean)));
}

export function mostRecent(runs: readonly PentestRun[]): PentestRun | null {
  if (runs.length === 0) return null;
  return [...runs].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0]!;
}

export function sortByUpdatedDesc(runs: readonly PentestRun[]): PentestRun[] {
  return [...runs].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function countWithin(
  runs: readonly PentestRun[],
  windowMs: number,
): number {
  const cutoff = Date.now() - windowMs;
  return runs.filter((r) => new Date(r.updatedAt).getTime() >= cutoff).length;
}

export function computeStaleTargets(
  runs: readonly PentestRun[],
  targets: string[],
): { targetUrl: string; lastScanAt: string | null }[] {
  const now = Date.now();
  return targets
    .map((targetUrl) => {
      const targetRuns = runs.filter((r) => r.targetUrl === targetUrl);
      const lastScan = mostRecent(targetRuns);
      const ageMs = lastScan
        ? now - new Date(lastScan.updatedAt).getTime()
        : Infinity;
      return {
        targetUrl,
        lastScanAt: lastScan?.updatedAt ?? null,
        ageMs,
      };
    })
    .filter(({ ageMs }) => ageMs > STALE_THRESHOLD_MS)
    .map(({ targetUrl, lastScanAt }) => ({ targetUrl, lastScanAt }));
}

/**
 * Average run duration in milliseconds, derived from `updatedAt - createdAt`
 * across the supplied runs. Filters out non-positive durations (clock skew,
 * rows that completed before they were stored, etc.). Returns 0 when there's
 * no usable data so callers can render a neutral placeholder.
 */
export function avgDurationMs(runs: readonly PentestRun[]): number {
  const durations = runs
    .map((r) => new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime())
    .filter((ms) => Number.isFinite(ms) && ms > 0);
  if (durations.length === 0) return 0;
  const total = durations.reduce((sum, ms) => sum + ms, 0);
  return Math.round(total / durations.length);
}

export function formatDurationLabel(ms: number): string {
  const totalMin = Math.max(Math.round(ms / 60_000), 0);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (totalMin === 0) return '< 1m';
  return `${totalMin}m`;
}

export function cadenceLabel(scansLast30d: number): string {
  if (scansLast30d === 0) return 'no scans in the last 30 days';
  if (scansLast30d >= 30) return 'multiple scans/day';
  const intervalDays = Math.round(30 / scansLast30d);
  if (intervalDays === 1) return 'about 1 scan/day';
  return `about 1 scan every ${intervalDays} days`;
}

export function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return minutes <= 1 ? 'just now' : `${minutes} min ago`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(ms / 86_400_000);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function displayHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
