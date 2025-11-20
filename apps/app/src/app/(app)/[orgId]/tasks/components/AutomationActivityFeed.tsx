"use client";

import { useParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Activity, CheckCircle2, Clock, XCircle, Zap } from "lucide-react";

import { Badge } from "@trycompai/ui/badge";
import { Card } from "@trycompai/ui/card";
import { Separator } from "@trycompai/ui/separator";

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
    if (status === "running") {
      return {
        icon: Activity,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
      };
    }
    if (status === "completed" && evaluationStatus === "pass") {
      return {
        icon: CheckCircle2,
        color: "text-primary",
        bgColor: "bg-primary/10",
      };
    }
    if (status === "failed" || evaluationStatus === "fail") {
      return {
        icon: XCircle,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
      };
    }
    return {
      icon: Clock,
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
    };
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return null;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <Card className="border-border bg-card">
      <div className="space-y-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 rounded-md p-1.5">
              <Zap className="text-primary h-4 w-4" />
            </div>
            <div>
              <h3 className="text-foreground text-sm font-semibold">
                Automation Activity
              </h3>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Real-time execution feed
              </p>
            </div>
          </div>
          {(runningCount > 0 || healthyCount > 0 || errorCount > 0) && (
            <div className="flex items-center gap-2">
              {runningCount > 0 && (
                <div className="flex items-center gap-1 rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-1">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                  <span className="text-[10px] font-medium text-blue-600 tabular-nums">
                    {runningCount} active
                  </span>
                </div>
              )}
              {healthyCount > 0 && (
                <div className="bg-primary/10 border-primary/20 flex items-center gap-1 rounded-md border px-2 py-1">
                  <div className="bg-primary h-1.5 w-1.5 rounded-full" />
                  <span className="text-primary text-[10px] font-medium tabular-nums">
                    {healthyCount} healthy
                  </span>
                </div>
              )}
              {errorCount > 0 && (
                <div className="bg-destructive/10 border-destructive/20 flex items-center gap-1 rounded-md border px-2 py-1">
                  <div className="bg-destructive h-1.5 w-1.5 rounded-full" />
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
        <div className="max-h-[300px] space-y-2 overflow-y-auto">
          {recentRuns.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="text-muted-foreground mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-muted-foreground text-sm">
                No recent activity
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Automation runs will appear here
              </p>
            </div>
          ) : (
            recentRuns.map((run, index) => {
              const statusInfo = getStatusIcon(
                run.status,
                run.evaluationStatus,
              );
              const StatusIcon = statusInfo.icon;
              const timeAgo = formatDistanceToNow(new Date(run.createdAt), {
                addSuffix: true,
              });

              return (
                <div
                  key={index}
                  className="hover:bg-muted/50 group flex items-start gap-3 rounded-md p-2 transition-colors"
                >
                  <div
                    className={`flex-shrink-0 rounded-md p-1.5 ${statusInfo.bgColor} mt-0.5`}
                  >
                    <StatusIcon className={`h-3 w-3 ${statusInfo.color}`} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm font-medium">
                          {run.automationName}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {run.taskTitle}
                        </p>
                      </div>
                      <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                        {timeAgo}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          run.status === "completed"
                            ? "default"
                            : run.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                        className="px-1.5 py-0 text-[10px] capitalize"
                      >
                        {run.status}
                      </Badge>
                      {run.evaluationStatus && (
                        <Badge
                          variant={
                            run.evaluationStatus === "pass"
                              ? "default"
                              : "destructive"
                          }
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {run.evaluationStatus === "pass"
                            ? "✓ Pass"
                            : "✗ Fail"}
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
