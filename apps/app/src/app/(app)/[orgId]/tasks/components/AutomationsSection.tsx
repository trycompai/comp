'use client';

import { Badge } from '@comp/ui/badge';
import { Card } from '@comp/ui/card';
import type { EvidenceAutomation, EvidenceAutomationRun, Task } from '@db';
import { formatDistanceToNow } from 'date-fns';
import { Activity, ArrowRight, CheckCircle2, Clock, Sparkles, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface AutomationWithTask {
  id: string;
  isEnabled: boolean;
  name: string;
  runs?: Array<{
    status: string;
    success: boolean | null;
    evaluationStatus: string | null;
    createdAt: Date;
    triggeredBy: string;
    runDuration: number | null;
  }>;
  task: Pick<Task, 'id' | 'title'>;
}

interface AutomationsSectionProps {
  automations: AutomationWithTask[];
}

export function AutomationsSection({ automations }: AutomationsSectionProps) {
  const params = useParams();
  const orgId = params.orgId as string;

  if (automations.length === 0) {
    return null;
  }

  const getStatusInfo = (automation: AutomationWithTask) => {
    const latestRun = automation.runs?.[0];

    if (!automation.isEnabled) {
      return {
        icon: Clock,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/50',
        label: 'Disabled',
        status: 'disabled' as const,
      };
    }

    if (!latestRun) {
      return {
        icon: Clock,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        label: 'Pending',
        status: 'pending' as const,
      };
    }

    if (latestRun.status === 'running') {
      return {
        icon: Activity,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        label: 'Running',
        status: 'running' as const,
      };
    }

    if (
      latestRun.status === 'completed' &&
      latestRun.success &&
      latestRun.evaluationStatus !== 'fail'
    ) {
      return {
        icon: CheckCircle2,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        label: 'Healthy',
        status: 'healthy' as const,
      };
    }

    return {
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      label: 'Error',
      status: 'error' as const,
    };
  };

  // Calculate summary stats
  const enabledCount = automations.filter((a) => a.isEnabled).length;
  const healthyCount = automations.filter((a) => {
    const run = a.runs?.[0];
    return (
      a.isEnabled &&
      run &&
      run.status === 'completed' &&
      run.success &&
      run.evaluationStatus !== 'fail'
    );
  }).length;
  const runningCount = automations.filter((a) => {
    const run = a.runs?.[0];
    return a.isEnabled && run && run.status === 'running';
  }).length;
  const errorCount = automations.filter((a) => {
    const run = a.runs?.[0];
    return (
      a.isEnabled &&
      run &&
      (run.status === 'failed' || run.evaluationStatus === 'fail')
    );
  }).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground text-lg font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Automations
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {automations.length} automation{automations.length !== 1 ? 's' : ''} across{' '}
            {new Set(automations.map((a) => a.task.id)).size} task
            {new Set(automations.map((a) => a.task.id)).size !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {enabledCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-card border border-border">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-muted-foreground tabular-nums">{enabledCount} enabled</span>
            </div>
          )}
          {runningCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-card border border-border">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-muted-foreground tabular-nums">{runningCount} running</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {automations.map((automation) => {
          const statusInfo = getStatusInfo(automation);
          const latestRun = automation.runs?.[0];
          const StatusIcon = statusInfo.icon;

          return (
            <Link
              key={automation.id}
              href={`/${orgId}/tasks/${automation.task.id}/automations/${automation.id}/overview`}
              className="group"
            >
              <Card className="border-border bg-card hover:border-primary/50 transition-all hover:shadow-sm h-full">
                <div className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-foreground font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {automation.name}
                      </h3>
                      <p className="text-muted-foreground text-xs mt-0.5 truncate">
                        {automation.task.title}
                      </p>
                    </div>
                    <div
                      className={`flex-shrink-0 p-1.5 rounded-md ${statusInfo.bgColor} ${statusInfo.color}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        statusInfo.status === 'healthy'
                          ? 'default'
                          : statusInfo.status === 'error'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="text-[10px] px-2 py-0.5"
                    >
                      {statusInfo.label}
                    </Badge>
                    {latestRun && (
                      <span className="text-muted-foreground text-[10px]">
                        {formatDistanceToNow(new Date(latestRun.createdAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>

                  {/* Latest Run Details */}
                  {latestRun && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{latestRun.status}</span>
                      {latestRun.evaluationStatus && (
                        <>
                          <span>•</span>
                          <Badge
                            variant={
                              latestRun.evaluationStatus === 'pass' ? 'default' : 'destructive'
                            }
                            className="text-[10px] px-1.5 py-0"
                          >
                            {latestRun.evaluationStatus === 'pass' ? 'Pass' : 'Fail'}
                          </Badge>
                        </>
                      )}
                    </div>
                  )}

                  {/* Arrow indicator */}
                  <div className="flex items-center justify-end pt-1">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
