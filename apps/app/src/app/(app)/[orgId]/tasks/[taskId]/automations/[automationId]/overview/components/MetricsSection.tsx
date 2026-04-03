'use client';

import type { EvidenceAutomationRun, EvidenceAutomationVersion } from '@db';
import { useMemo } from 'react';

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
        <p className="text-sm font-medium">Every Day 9:00 AM</p>
      </div>

      <div className="px-4">
        <p className="text-xs text-muted-foreground mb-1">Next Run</p>
        <p className="text-sm font-medium">Tomorrow 9:00 AM</p>
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
