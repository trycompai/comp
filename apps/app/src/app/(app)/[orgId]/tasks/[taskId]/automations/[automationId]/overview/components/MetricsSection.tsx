'use client';

import type { EvidenceAutomationRun, EvidenceAutomationVersion, TaskFrequency } from '@db';
import { useEffect, useMemo, useState } from 'react';

interface MetricsSectionProps {
  initialVersions: EvidenceAutomationVersion[];
  initialRuns: EvidenceAutomationRun[];
  scheduleFrequency: TaskFrequency;
  lastRunAt: Date | string | null;
}

const FREQUENCY_DESCRIPTIONS: Record<TaskFrequency, string> = {
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
  quarterly: 'Every quarter',
  yearly: 'Every year',
};

const PERIOD_DAYS: Record<TaskFrequency, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 91,
  yearly: 365,
};

// The orchestrator fires daily at 09:00 UTC and decides per-automation whether
// the schedule says to run today (see apps/api/src/trigger/shared/is-due-today.ts).
// We approximate the next qualifying tick by adding the frequency's period to
// `lastRunAt` (or `now` if never run) and snapping to the next 09:00 UTC.
const ORCHESTRATOR_HOUR_UTC = 9;

function computeNextRunUtc(
  scheduleFrequency: TaskFrequency,
  lastRunAt: Date | null,
  now: Date,
): Date {
  const base = lastRunAt ?? now;
  const candidate = new Date(base.getTime());
  candidate.setUTCDate(candidate.getUTCDate() + PERIOD_DAYS[scheduleFrequency]);
  candidate.setUTCHours(ORCHESTRATOR_HOUR_UTC, 0, 0, 0);
  if (candidate.getTime() <= now.getTime()) {
    // We're already past the candidate; jump to the next 09:00 UTC tick.
    const next = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), ORCHESTRATOR_HOUR_UTC),
    );
    if (next.getTime() <= now.getTime()) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    return next;
  }
  return candidate;
}

export function MetricsSection({
  initialVersions,
  initialRuns,
  scheduleFrequency,
  lastRunAt,
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
  const successRateColor =
    successRate >= 90 ? 'text-primary' : successRate >= 60 ? 'text-warning' : 'text-destructive';
  const latestRun = initialRuns[0];

  // Render schedule + next-run labels client-side only to avoid a hydration
  // mismatch (Node renders in the server's locale + timezone, the browser in
  // the user's). We show "—" during SSR and fill in after mount.
  const [scheduleLabel, setScheduleLabel] = useState<string | null>(null);
  const [nextRunLabel, setNextRunLabel] = useState<string | null>(null);
  const [lastRunLabel, setLastRunLabel] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const last = lastRunAt ? new Date(lastRunAt) : null;
    const next = computeNextRunUtc(scheduleFrequency, last, now);

    // Format the recurring time in the user's timezone (e.g., "Every day at
    // 4:00 AM EST"). Pulling time-of-day from the next-run instant guarantees
    // the schedule and next-run labels agree about clock time.
    const timeOfDay = next.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    });
    setScheduleLabel(`${FREQUENCY_DESCRIPTIONS[scheduleFrequency]} at ${timeOfDay}`);

    setNextRunLabel(
      next.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short',
      }),
    );

    if (latestRun) {
      setLastRunLabel(
        new Date(latestRun.createdAt).toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      );
    } else {
      setLastRunLabel(null);
    }
  }, [scheduleFrequency, lastRunAt, latestRun]);

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
        <p className="text-sm font-medium">{scheduleLabel ?? '—'}</p>
      </div>

      <div className="px-4">
        <p className="text-xs text-muted-foreground mb-1">Next Run</p>
        <p className="text-sm font-medium">{nextRunLabel ?? '—'}</p>
      </div>

      <div className="px-4">
        <p className="text-xs text-muted-foreground mb-1">Last Run</p>
        {latestRun ? (
          <>
            <p className="text-sm font-medium">{lastRunLabel ?? '—'}</p>
            <p
              className={`text-xs font-medium ${
                latestRun.status === 'completed' && latestRun.evaluationStatus !== 'fail'
                  ? 'text-primary'
                  : 'text-destructive'
              }`}
            >
              {latestRun.status === 'completed' && latestRun.evaluationStatus !== 'fail'
                ? 'Complete'
                : 'Failed'}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No runs yet</p>
        )}
      </div>
    </div>
  );
}
