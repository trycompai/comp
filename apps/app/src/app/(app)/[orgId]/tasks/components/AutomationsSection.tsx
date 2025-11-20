"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  XCircle,
} from "lucide-react";

import type { Task } from "@trycompai/db";
import { Badge } from "@trycompai/ui/badge";
import { Card } from "@trycompai/ui/card";

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
  task: Pick<Task, "id" | "title">;
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
        color: "text-muted-foreground",
        bgColor: "bg-muted/50",
        label: "Disabled",
        status: "disabled" as const,
      };
    }

    if (!latestRun) {
      return {
        icon: Clock,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        label: "Pending",
        status: "pending" as const,
      };
    }

    if (latestRun.status === "running") {
      return {
        icon: Activity,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        label: "Running",
        status: "running" as const,
      };
    }

    if (
      latestRun.status === "completed" &&
      latestRun.success &&
      latestRun.evaluationStatus !== "fail"
    ) {
      return {
        icon: CheckCircle2,
        color: "text-primary",
        bgColor: "bg-primary/10",
        label: "Healthy",
        status: "healthy" as const,
      };
    }

    return {
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      label: "Error",
      status: "error" as const,
    };
  };

  // Calculate summary stats
  const enabledCount = automations.filter((a) => a.isEnabled).length;
  const healthyCount = automations.filter((a) => {
    const run = a.runs?.[0];
    return (
      a.isEnabled &&
      run &&
      run.status === "completed" &&
      run.success &&
      run.evaluationStatus !== "fail"
    );
  }).length;
  const runningCount = automations.filter((a) => {
    const run = a.runs?.[0];
    return a.isEnabled && run && run.status === "running";
  }).length;
  const errorCount = automations.filter((a) => {
    const run = a.runs?.[0];
    return (
      a.isEnabled &&
      run &&
      (run.status === "failed" || run.evaluationStatus === "fail")
    );
  }).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Sparkles className="text-primary h-4 w-4" />
            Automations
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {automations.length} automation{automations.length !== 1 ? "s" : ""}{" "}
            across {new Set(automations.map((a) => a.task.id)).size} task
            {new Set(automations.map((a) => a.task.id)).size !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {enabledCount > 0 && (
            <div className="bg-card border-border flex items-center gap-1.5 rounded-md border px-2 py-1">
              <div className="bg-primary h-1.5 w-1.5 rounded-full" />
              <span className="text-muted-foreground tabular-nums">
                {enabledCount} enabled
              </span>
            </div>
          )}
          {runningCount > 0 && (
            <div className="bg-card border-border flex items-center gap-1.5 rounded-md border px-2 py-1">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
              <span className="text-muted-foreground tabular-nums">
                {runningCount} running
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
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
              <Card className="border-border bg-card hover:border-primary/50 h-full transition-all hover:shadow-sm">
                <div className="space-y-3 p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-foreground group-hover:text-primary truncate text-sm font-medium transition-colors">
                        {automation.name}
                      </h3>
                      <p className="text-muted-foreground mt-0.5 truncate text-xs">
                        {automation.task.title}
                      </p>
                    </div>
                    <div
                      className={`flex-shrink-0 rounded-md p-1.5 ${statusInfo.bgColor} ${statusInfo.color}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        statusInfo.status === "healthy"
                          ? "default"
                          : statusInfo.status === "error"
                            ? "destructive"
                            : "secondary"
                      }
                      className="px-2 py-0.5 text-[10px]"
                    >
                      {statusInfo.label}
                    </Badge>
                    {latestRun && (
                      <span className="text-muted-foreground text-[10px]">
                        {formatDistanceToNow(new Date(latestRun.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </div>

                  {/* Latest Run Details */}
                  {latestRun && (
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <span className="capitalize">{latestRun.status}</span>
                      {latestRun.evaluationStatus && (
                        <>
                          <span>•</span>
                          <Badge
                            variant={
                              latestRun.evaluationStatus === "pass"
                                ? "default"
                                : "destructive"
                            }
                            className="px-1.5 py-0 text-[10px]"
                          >
                            {latestRun.evaluationStatus === "pass"
                              ? "Pass"
                              : "Fail"}
                          </Badge>
                        </>
                      )}
                    </div>
                  )}

                  {/* Arrow indicator */}
                  <div className="flex items-center justify-end pt-1">
                    <ArrowRight className="text-muted-foreground group-hover:text-primary h-3.5 w-3.5 transition-all group-hover:translate-x-0.5" />
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
