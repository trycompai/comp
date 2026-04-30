'use client';

import { cn } from '@trycompai/design-system/cn';
import { Progress } from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { useRouter } from 'next/navigation';
import type { PentestRun } from '@/lib/security/penetration-tests-client';
import { formatReportDate } from '../lib';
import { StatusPill } from './StatusPill';
import { isRunInProgress } from './severity';

interface RunListProps {
  orgId: string;
  runs: PentestRun[];
  selectedRunId: string | null;
  onCreateClick: () => void;
  /** Spendable credit balance — drives the "X runs left" badge. */
  balance?: number;
  /** True when the user has used their initial trial (balance 0, totalGranted > 0). */
  trialUsed?: boolean;
}

export function RunList({
  orgId,
  runs,
  selectedRunId,
  onCreateClick,
  balance,
  trialUsed,
}: RunListProps) {
  const router = useRouter();
  const canCreate = balance === undefined ? true : balance > 0;
  const newButtonTitle = !canCreate
    ? trialUsed
      ? "You've used your trial run. Paid plans coming soon."
      : 'No pentest runs remaining.'
    : 'Start a new scan';
  return (
    <aside className="flex h-full min-h-0 w-full xl:w-[340px] xl:shrink-0 flex-col border-r border-border bg-background">
      {/* Header — matches "Scans  6   Filter  Sort" from the design */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={() => router.push(`/${orgId}/security/penetration-tests`)}
          className="flex items-center gap-2 text-left"
        >
          <span className="text-sm font-medium">Scans</span>
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
            {runs.length}
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCreateClick}
            disabled={!canCreate}
            title={newButtonTitle}
            className={cn(
              'flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[11px] font-semibold',
              canCreate
                ? 'hover:bg-muted'
                : 'cursor-not-allowed opacity-50',
            )}
          >
            <Add className="h-3 w-3" />
            New
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {runs.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
            No scans yet.
          </div>
        ) : (
          <ul role="list" className="divide-y divide-border">
            {runs.map((run) => (
              <RunRow
                key={run.id}
                orgId={orgId}
                run={run}
                selected={run.id === selectedRunId}
              />
            ))}
          </ul>
        )}
      </div>
      {balance !== undefined && (
        <QuotaFooter balance={balance} trialUsed={Boolean(trialUsed)} />
      )}
    </aside>
  );
}

interface QuotaFooterProps {
  balance: number;
  trialUsed: boolean;
}

/**
 * Sidebar footer showing scan-quota status. Persistent across overview /
 * detail / create routes — always visible without crowding the header
 * actions. Falls back to a "Contact support" mailto when the user is at
 * zero so they have a clear next step.
 */
function QuotaFooter({ balance, trialUsed }: QuotaFooterProps) {
  if (balance > 0) {
    return (
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            <span className="font-mono tabular-nums text-foreground">
              {balance}
            </span>{' '}
            scan{balance === 1 ? '' : 's'} remaining
          </span>
          <span className="text-[10px] uppercase tracking-[0.06em]">Trial</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="text-[11px] font-medium">
        {trialUsed ? "You've used your trial scan" : 'No scans available'}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">
        Paid plans coming soon —{' '}
        <a
          href="mailto:support@trycomp.ai?subject=Pentest%20scan%20access"
          className="underline hover:text-foreground"
        >
          contact support
        </a>
        .
      </div>
    </div>
  );
}

interface RunRowProps {
  orgId: string;
  run: PentestRun;
  selected: boolean;
}

function RunRow({ orgId, run, selected }: RunRowProps) {
  const router = useRouter();
  const inProgress = isRunInProgress(run.status);
  const shortId = toShortId(run.id);
  const progress = run.progress;
  const progressPercent =
    progress && progress.totalAgents > 0
      ? Math.round((progress.completedAgents / progress.totalAgents) * 100)
      : 0;
  const elapsedLabel = progress ? formatElapsed(progress.elapsedMs) : null;
  const etaLabel = progress ? formatEta(progress) : null;
  const target = displayTarget(run.targetUrl);

  return (
    <li
      role="button"
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      onClick={() =>
        router.push(
          `/${orgId}/security/penetration-tests/${encodeURIComponent(run.id)}`,
        )
      }
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(
            `/${orgId}/security/penetration-tests/${encodeURIComponent(run.id)}`,
          );
        }
      }}
      className={cn(
        'flex cursor-pointer flex-col gap-1.5 px-4 py-3 outline-none transition-colors',
        'hover:bg-muted focus-visible:bg-muted',
        selected && 'bg-muted border-l-2 border-l-primary',
      )}
    >
      <div className="flex items-center gap-2">
        <StatusPill status={run.status} />
        <span className="font-mono text-[11px] text-muted-foreground">
          {shortId}
        </span>
      </div>
      <div className="truncate font-mono text-sm">{target}</div>
      <div className="font-mono text-[11px] text-muted-foreground">
        {formatReportDate(run.updatedAt)}
      </div>
      {inProgress ? (
        <div className="mt-1 space-y-1">
          <div className="h-1">
            <Progress value={progressPercent} />
          </div>
          {(elapsedLabel || etaLabel) && (
            <div className="text-right font-mono text-[10px] text-muted-foreground">
              {elapsedLabel}
              {etaLabel ? ` · eta ~${etaLabel}` : ''}
            </div>
          )}
        </div>
      ) : run.status === 'failed' || run.status === 'cancelled' ? (
        <div className="text-[11px] text-destructive">
          {run.failedReason ?? run.error ?? 'Error'}
        </div>
      ) : null}
    </li>
  );
}

function toShortId(fullId: string): string {
  // Maced IDs look like `pentest-1777037987579`. Render a compact "PT-7579"
  // style label for list rows; the full id is still accessible via URL.
  const tail = fullId.replace(/[^0-9]/g, '').slice(-4);
  return tail ? `PT-${tail}` : fullId;
}

function displayTarget(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function formatElapsed(ms: number): string {
  const totalMin = Math.max(Math.floor(ms / 60_000), 0);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${totalMin}m`;
}

function formatEta(progress: {
  completedAgents: number;
  totalAgents: number;
  elapsedMs: number;
}): string | null {
  if (progress.completedAgents <= 0 || progress.totalAgents <= 0) return null;
  const rateMs = progress.elapsedMs / progress.completedAgents;
  const remaining = progress.totalAgents - progress.completedAgents;
  if (remaining <= 0) return null;
  return formatElapsed(rateMs * remaining);
}
