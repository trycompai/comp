'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { EvidenceAutomationRun, EvidenceAutomationRunStatus } from '@db';
import { formatDistanceToNow } from 'date-fns';
import { Zap } from 'lucide-react';

interface AutomationRunsCardProps {
  runs: EvidenceAutomationRun[];
}

export function AutomationRunsCard({ runs }: AutomationRunsCardProps) {
  if (!runs || runs.length === 0) {
    return null;
  }

  const sortedRuns = [...runs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getStatusColor = (status: EvidenceAutomationRunStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-chart-positive';
      case 'failed':
        return 'bg-chart-destructive';
      case 'running':
        return 'bg-chart-other animate-pulse';
      case 'pending':
        return 'bg-chart-neutral';
      case 'cancelled':
        return 'bg-chart-warning';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Automation History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedRuns.map((run) => {
          const timeAgo = formatDistanceToNow(new Date(run.createdAt), { addSuffix: true });
          const duration = run.completedAt
            ? Math.round(
                (new Date(run.completedAt).getTime() - new Date(run.createdAt).getTime()) / 1000,
              )
            : null;

          const isSuccess = run.status === 'completed';
          const isFailed = run.status === 'failed';
          const isRunning = run.status === 'running';
          const isPending = run.status === 'pending';

          return (
            <div
              key={run.id}
              className="group relative flex items-start gap-3 p-3 rounded-xs border border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/20 transition-all"
            >
              {/* Status indicator dot */}
              <div
                className={`h-2 w-2 rounded-full flex-shrink-0 mt-1.5 ${getStatusColor(run.status)}`}
              />

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        isSuccess
                          ? 'text-chart-positive'
                          : isFailed
                            ? 'text-chart-destructive'
                            : isRunning
                              ? 'text-chart-other'
                              : 'text-chart-neutral'
                      }`}
                    >
                      {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{timeAgo}</span>
                  {run.triggeredBy && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{run.triggeredBy}</span>
                    </>
                  )}
                </div>

                {/* Error message if failed */}
                {isFailed && run.error && (
                  <p className="text-xs text-chart-destructive mt-1 line-clamp-1">{run.error}</p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
