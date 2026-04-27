'use client';

import { cn } from '@trycompai/design-system/cn';
import type { PentestRun } from '@/lib/security/penetration-tests-client';
import { formatReportDate } from '../lib';
import { SevTally } from './SevTally';
import { StatusPill } from './StatusPill';
import { isRunInProgress, isRunTerminal } from './severity';

interface OverviewPaneProps {
  runs: PentestRun[];
}

/**
 * Default right-pane when no run is selected. Surfaces at-a-glance posture:
 *   - KPI strip (open needs-action, running now, recent cadence)
 *   - Severity roll-up
 *   - Targets + last scan
 * Full version of the Overview from the design handoff requires backend
 * aggregations we don't have yet (14-day cadence series, denormalized top-N
 * findings). This ships the pieces we can compute client-side from the list.
 */
export function OverviewPane({ runs }: OverviewPaneProps) {
  const running = runs.filter((r) => isRunInProgress(r.status));
  const terminal = runs.filter((r) => isRunTerminal(r.status));
  const completed = terminal.filter((r) => r.status === 'completed');
  const failed = terminal.filter((r) => r.status === 'failed');

  // Target roll-up — last scan per distinct target URL.
  const targetsMap = new Map<string, PentestRun>();
  for (const run of runs) {
    const existing = targetsMap.get(run.targetUrl);
    if (!existing || new Date(run.updatedAt) > new Date(existing.updatedAt)) {
      targetsMap.set(run.targetUrl, run);
    }
  }
  const targets = Array.from(targetsMap.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <div className="min-h-0 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-8 space-y-6">
        <header>
          <h1 className="text-[26px] font-medium tracking-[-0.02em]">
            Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a scan from the list or start a new one.
          </p>
        </header>

        <KPIStrip
          runsTotal={runs.length}
          running={running.length}
          completed={completed.length}
          failed={failed.length}
        />

        <div>
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Severity roll-up
          </h2>
          <SevTally
            counts={{}}
            size="mid"
            className="bg-background"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Per-org finding aggregation coming soon. Open a scan to see its findings.
          </p>
        </div>

        <TargetsList targets={targets} />
      </div>
    </div>
  );
}

interface KPIStripProps {
  runsTotal: number;
  running: number;
  completed: number;
  failed: number;
}

function KPIStrip({ runsTotal, running, completed, failed }: KPIStripProps) {
  const cells = [
    { label: 'Total scans', value: runsTotal },
    { label: 'Running now', value: running },
    { label: 'Completed', value: completed },
    { label: 'Failed', value: failed },
  ];
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-[var(--radius)] border border-border md:grid-cols-4">
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          className={cn(
            'flex flex-col gap-1 border-border px-5 py-4',
            i < cells.length - 1 && 'md:border-r',
            i < 2 && 'border-b md:border-b-0',
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {cell.label}
          </span>
          <span className="text-[40px] font-light leading-none tracking-[-0.03em] tabular-nums">
            {cell.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function TargetsList({ targets }: { targets: PentestRun[] }) {
  if (targets.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-border">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Targets · last scan
        </h2>
      </div>
      <table className="w-full border-collapse text-sm">
        <tbody className="divide-y divide-border">
          {targets.slice(0, 10).map((run) => (
            <tr key={run.id}>
              <td className="px-4 py-2.5 align-middle">
                <div className="truncate text-sm">{run.targetUrl}</div>
              </td>
              <td className="px-4 py-2.5 align-middle font-mono text-xs text-muted-foreground">
                {formatReportDate(run.updatedAt)}
              </td>
              <td className="px-4 py-2.5 text-right align-middle">
                <StatusPill status={run.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
