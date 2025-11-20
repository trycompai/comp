"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Activity, ChevronDown } from "lucide-react";

import {
  EvidenceAutomationRun,
  EvidenceAutomationRunStatus,
} from "@trycompai/db";
import { Badge } from "@trycompai/ui/badge";
import { Button } from "@trycompai/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@trycompai/ui/card";

type AutomationRunWithName = EvidenceAutomationRun & {
  evidenceAutomation: {
    name: string;
  };
};

interface AutomationRunsCardProps {
  runs: AutomationRunWithName[];
}

export function AutomationRunsCard({ runs }: AutomationRunsCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Group runs by date
  const groupedRuns = useMemo(() => {
    const groups: Record<string, AutomationRunWithName[]> = {};

    runs?.forEach((run) => {
      const date = new Date(run.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(run);
    });

    return groups;
  }, [runs]);

  if (!runs || runs.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="from-muted/30 bg-gradient-to-br to-transparent pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <div className="bg-primary/10 rounded-xs p-1.5">
              <Activity className="text-primary h-3.5 w-3.5" />
            </div>
            Automation History
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="space-y-2 text-center">
            <p className="text-muted-foreground text-sm">
              No automation runs yet
            </p>
            <p className="text-muted-foreground text-xs">
              Runs will appear here once automations are executed
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedRuns = [...runs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const displayRuns = showAll ? sortedRuns : sortedRuns.slice(0, 3);
  const hasMore = runs.length > 3;

  const getStatusStyles = (status: EvidenceAutomationRunStatus) => {
    switch (status) {
      case "completed":
        return {
          dot: "bg-chart-positive shadow-[0_0_8px_rgba(0,76,58,0.4)]",
          text: "text-chart-positive",
          bg: "bg-chart-positive/5",
        };
      case "failed":
        return {
          dot: "bg-chart-destructive shadow-[0_0_8px_rgba(255,0,0,0.3)]",
          text: "text-chart-destructive",
          bg: "bg-chart-destructive/5",
        };
      case "running":
        return {
          dot: "bg-chart-other animate-pulse shadow-[0_0_8px_rgba(32,128,141,0.4)]",
          text: "text-chart-other",
          bg: "bg-chart-other/5",
        };
      case "pending":
        return {
          dot: "bg-chart-neutral shadow-[0_0_6px_rgba(255,192,7,0.3)]",
          text: "text-chart-neutral",
          bg: "bg-chart-neutral/5",
        };
      case "cancelled":
        return {
          dot: "bg-chart-warning",
          text: "text-chart-warning",
          bg: "bg-chart-warning/5",
        };
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="from-muted/30 bg-gradient-to-br to-transparent pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <div className="bg-primary/10 rounded-xs p-1.5">
            <Activity className="text-primary h-3.5 w-3.5" />
          </div>
          Automation History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {Object.entries(groupedRuns).map(([date, dateRuns]) => {
          const visibleRuns = showAll ? dateRuns : dateRuns.slice(0, 3);

          return (
            <div key={date} className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">
                {date}
              </p>
              <div className="space-y-1">
                {visibleRuns.map((run, index) => {
                  const timeAgo = formatDistanceToNow(new Date(run.createdAt), {
                    addSuffix: true,
                  });
                  const styles = getStatusStyles(run.status);
                  const isFailed = run.status === "failed";
                  const isFirst = index === 0;
                  const isExpanded = expandedId === run.id;
                  const hasDetails = !!(run.logs || run.output);

                  return (
                    <div
                      key={run.id}
                      className={`group relative rounded-xs border transition-all duration-300 ${styles.bg} ${
                        isFirst
                          ? "border-primary/20 hover:border-primary/30 shadow-sm hover:shadow-md"
                          : "border-border/50 hover:border-border hover:shadow-sm"
                      }`}
                    >
                      <button
                        onClick={() =>
                          setExpandedId(isExpanded ? null : run.id)
                        }
                        className="w-full text-left"
                        disabled={!hasDetails}
                      >
                        <div className="flex items-start gap-3 px-4 py-3">
                          {/* Status indicator dot with glow */}
                          <div
                            className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${styles.dot}`}
                          />

                          {/* Content */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                <p className="text-foreground truncate text-sm font-medium">
                                  {run.evidenceAutomation.name}
                                </p>
                                {run.version ? (
                                  <Badge
                                    variant="secondary"
                                    className="px-1.5 py-0 text-[10px]"
                                  >
                                    v{run.version}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="px-1.5 py-0 text-[10px]"
                                  >
                                    draft
                                  </Badge>
                                )}
                              </div>
                              {hasDetails && (
                                <ChevronDown
                                  className={`text-muted-foreground h-4 w-4 transition-transform duration-700 ease-in-out ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                />
                              )}
                            </div>

                            <div className="text-muted-foreground flex items-center gap-2 text-xs">
                              <span className={`font-medium ${styles.text}`}>
                                {run.status.charAt(0).toUpperCase() +
                                  run.status.slice(1)}
                              </span>
                              {run.evaluationStatus && (
                                <>
                                  <span className="text-[10px]">•</span>
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
                                </>
                              )}
                              <span className="text-[10px]">•</span>
                              <span>{timeAgo}</span>
                              {run.triggeredBy && (
                                <>
                                  <span className="text-[10px]">•</span>
                                  <span className="font-medium capitalize">
                                    {run.triggeredBy}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Expandable details with CSS grid animation */}
                      <div
                        className={`grid transition-all duration-700 ease-in-out ${
                          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="border-border/50 space-y-3 border-t px-4 pt-3 pb-3">
                            {/* Evaluation Reason */}
                            {run.evaluationReason && (
                              <div className="space-y-1.5">
                                <div className="flex items-center">
                                  <p className="text-xs font-medium">
                                    Evaluation
                                  </p>
                                </div>
                                <p className="text-foreground text-xs leading-relaxed">
                                  {run.evaluationReason}
                                </p>
                              </div>
                            )}

                            {/* Logs */}
                            {run.logs && (
                              <div className="space-y-1">
                                <p className="text-muted-foreground text-xs font-medium">
                                  Logs
                                </p>
                                <pre className="bg-muted/50 max-h-40 overflow-x-auto overflow-y-auto rounded-xs p-2 font-mono text-xs">
                                  {typeof run.logs === "string"
                                    ? run.logs
                                    : JSON.stringify(run.logs, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* Output */}
                            {run.output && (
                              <div className="space-y-1">
                                <p className="text-muted-foreground text-xs font-medium">
                                  Output
                                </p>
                                <pre className="bg-muted/50 max-h-40 overflow-x-auto overflow-y-auto rounded-xs p-2 font-mono text-xs">
                                  {typeof run.output === "string"
                                    ? run.output
                                    : JSON.stringify(run.output, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* Error message if failed */}
                            {isFailed && run.error && (
                              <div className="bg-chart-destructive/10 border-chart-destructive/20 rounded-xs border px-2 py-1.5">
                                <p className="text-chart-destructive/90 text-xs">
                                  {run.error}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {hasMore && (
          <div className="pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="w-full text-xs"
            >
              {showAll ? "Show less" : `Show ${runs.length - 3} more`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
