'use client';

import { Badge } from '@comp/ui/badge';
import { Card } from '@comp/ui/card';
import { Separator } from '@comp/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { Activity, CheckCircle2, Clock, Sparkles, XCircle, Zap } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface AutomationRun {
  taskTitle: string;
  automationName: string;
  status: string;
  success: boolean | null;
  evaluationStatus: string | null;
  createdAt: Date;
  triggeredBy: string;
  runDuration: number | null;
}

interface AutomationActivityFeedProps {
  recentRuns: AutomationRun[];
  runningCount: number;
  healthyCount: number;
  errorCount: number;
}

export function AutomationActivityFeed({
  recentRuns,
  runningCount,
  healthyCount,
  errorCount,
}: AutomationActivityFeedProps) {
  const params = useParams();
  const orgId = params.orgId as string;

  if (recentRuns.length === 0 && runningCount === 0) {
    return null;
  }

  const getStatusIcon = (status: string, evaluationStatus: string | null) => {
    if (status === 'running') {
      return { icon: Activity, color: 'text-blue-500', bgColor: 'bg-blue-500/10' };
    }
    if (status === 'completed' && evaluationStatus === 'pass') {
      return { icon: CheckCircle2, color: 'text-primary', bgColor: 'bg-primary/10' };
    }
    if (status === 'failed' || evaluationStatus === 'fail') {
      return { icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10' };
    }
    return { icon: Clock, color: 'text-muted-foreground', bgColor: 'bg-muted/50' };
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return null;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <Card className="border-border bg-card">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-foreground font-semibold text-sm">Automation Activity</h3>
              <p className="text-muted-foreground text-xs mt-0.5">Real-time execution feed</p>
            </div>
          </div>
          {(runningCount > 0 || healthyCount > 0 || errorCount > 0) && (
            <div className="flex items-center gap-2">
              {runningCount > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-blue-600 text-[10px] font-medium tabular-nums">
                    {runningCount} active
                  </span>
                </div>
              )}
              {healthyCount > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 border border-primary/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-primary text-[10px] font-medium tabular-nums">
                    {healthyCount} healthy
                  </span>
                </div>
              )}
              {errorCount > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-destructive/10 border border-destructive/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                  <span className="text-destructive text-[10px] font-medium tabular-nums">
                    {errorCount} errors
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Activity Feed */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {recentRuns.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground text-sm">No recent activity</p>
              <p className="text-muted-foreground text-xs mt-1">
                Automation runs will appear here
              </p>
            </div>
          ) : (
            recentRuns.map((run, index) => {
              const statusInfo = getStatusIcon(run.status, run.evaluationStatus);
              const StatusIcon = statusInfo.icon;
              const timeAgo = formatDistanceToNow(new Date(run.createdAt), { addSuffix: true });

              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors group"
                >
                  <div className={`flex-shrink-0 p-1.5 rounded-md ${statusInfo.bgColor} mt-0.5`}>
                    <StatusIcon className={`h-3 w-3 ${statusInfo.color}`} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-medium truncate">
                          {run.automationName}
                        </p>
                        <p className="text-muted-foreground text-xs truncate">{run.taskTitle}</p>
                      </div>
                      <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                        {timeAgo}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={
                          run.status === 'completed'
                            ? 'default'
                            : run.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                        }
                        className="text-[10px] px-1.5 py-0 capitalize"
                      >
                        {run.status}
                      </Badge>
                      {run.evaluationStatus && (
                        <Badge
                          variant={run.evaluationStatus === 'pass' ? 'default' : 'destructive'}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {run.evaluationStatus === 'pass' ? '✓ Pass' : '✗ Fail'}
                        </Badge>
                      )}
                      {run.triggeredBy && (
                        <span className="text-muted-foreground text-[10px] capitalize">
                          {run.triggeredBy}
                        </span>
                      )}
                      {run.runDuration && (
                        <span className="text-muted-foreground text-[10px] tabular-nums">
                          {formatDuration(run.runDuration)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}

