'use client';

import type { EvidenceAutomationRun, EvidenceAutomationVersion } from '@db';
import { useEffect, useMemo, useState } from 'react';

interface MetricsSectionProps {
  initialVersions: EvidenceAutomationVersion[];
  initialRuns: EvidenceAutomationRun[];
}

export function MetricsSection({
  initialVersions,
  initialRuns,
}: MetricsSectionProps) {
  const thisWeekRuns = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);
    return initialRuns.filter((run) => new Date(run.createdAt) >= monday);
  }, [initialRuns]);

  const totalRuns = thisWeekRuns.length;
  const successfulRuns = thisWeekRuns.filter(
    (run) => run.status === 'completed' && run.success && run.evaluationStatus !== 'fail',
  ).length;
  const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;
  const successRateColor = successRate >= 90 ? 'text-primary' : successRate >= 60 ? 'text-warning' : 'text-destructive';
  const latestRun = initialRuns[0];

  // Automations run daily at 09:00 UTC (see
  // comp-private/apps/enterprise-api/src/trigger/automation/run-automations-schedule.ts).
  // Render the schedule explicitly in UTC and the next run in the user's
  // local timezone so the label matches when it actually fires.
  //
  // The next-run label is computed on the client only (useState + useEffect
  // instead of useMemo) to avoid a hydration mismatch: Node.js renders in
  // the server's timezone + locale (typically UTC) while the browser renders
  // in the user's, and `new Date()` can also tick across 09:00 UTC between
  // the two renders and produce a different weekday. We render `—` during
  // SSR and fill it in once mounted.
  const [nextRunLabel, setNextRunLabel] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const next = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        9,
        0,
        0,
        0,
      ),
    );
    if (next.getTime() <= now.getTime()) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    // Include timeZoneName so the label is unambiguous alongside the UTC
    // Schedule card — otherwise "Fri 12:00 PM" could be mistaken for UTC.
    setNextRunLabel(
      next.toLocaleString(undefined, {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short',
      }),
    );
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 divide-x border-y py-4">
      <div className="px-4">
        <p className="text-xs text-muted-foreground mb-1">Success Rate</p>
        <p className={`text-2xl font-semibold ${totalRuns > 0 ? successRateColor : 'text-muted-foreground'}`}>
          {totalRuns > 0 ? `${successRate}%` : '—'}
        </p>
        <p className="text-xs text-muted-foreground">This week</p>
      </div>

      <div className="px-4">
        <p className="text-xs text-muted-foreground mb-1">Schedule</p>
        <p className="text-sm font-medium">Every day at 9:00 AM UTC</p>
      </div>

      <div className="px-4">
        <p className="text-xs text-muted-foreground mb-1">Next Run</p>
        <p className="text-sm font-medium">{nextRunLabel ?? '—'}</p>
      </div>

      <div className="px-4">
        <p className="text-xs text-muted-foreground mb-1">Last Run</p>
        {latestRun ? (
          <>
            <p className="text-sm font-medium">
              {new Date(latestRun.createdAt).toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </p>
            <p className={`text-xs font-medium ${
              latestRun.status === 'completed' && latestRun.evaluationStatus !== 'fail'
                ? 'text-primary'
                : 'text-destructive'
            }`}>
              {latestRun.status === 'completed' && latestRun.evaluationStatus !== 'fail' ? 'Complete' : 'Failed'}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No runs yet</p>
        )}
      </div>
    </div>
  );
}
