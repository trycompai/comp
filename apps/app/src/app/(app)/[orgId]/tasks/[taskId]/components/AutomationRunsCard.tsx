'use client';

import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { EvidenceAutomationRun, EvidenceAutomationRunStatus } from '@db';
import { formatDistanceToNow } from 'date-fns';
import { Activity, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';

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
      const date = new Date(run.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
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
        <CardHeader className="pb-4 bg-gradient-to-br from-muted/30 to-transparent">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className="p-1.5 rounded-xs bg-primary/10">
              <Activity className="h-3.5 w-3.5 text-primary" />
            </div>
            Automation History
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">No automation runs yet</p>
            <p className="text-xs text-muted-foreground">
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
      case 'completed':
        return {
          dot: 'bg-chart-positive shadow-[0_0_8px_rgba(0,76,58,0.4)]',
          text: 'text-chart-positive',
          bg: 'bg-chart-positive/5',
        };
      case 'failed':
        return {
          dot: 'bg-chart-destructive shadow-[0_0_8px_rgba(255,0,0,0.3)]',
          text: 'text-chart-destructive',
          bg: 'bg-chart-destructive/5',
        };
      case 'running':
        return {
          dot: 'bg-chart-other animate-pulse shadow-[0_0_8px_rgba(32,128,141,0.4)]',
          text: 'text-chart-other',
          bg: 'bg-chart-other/5',
        };
      case 'pending':
        return {
          dot: 'bg-chart-neutral shadow-[0_0_6px_rgba(255,192,7,0.3)]',
          text: 'text-chart-neutral',
          bg: 'bg-chart-neutral/5',
        };
      case 'cancelled':
        return {
          dot: 'bg-chart-warning',
          text: 'text-chart-warning',
          bg: 'bg-chart-warning/5',
        };
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4 bg-gradient-to-br from-muted/30 to-transparent">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <div className="p-1.5 rounded-xs bg-primary/10">
            <Activity className="h-3.5 w-3.5 text-primary" />
          </div>
          Automation History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {Object.entries(groupedRuns).map(([date, dateRuns]) => {
          const visibleRuns = showAll ? dateRuns : dateRuns.slice(0, 3);

          return (
            <div key={date} className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{date}</p>
              <div className="space-y-1">
                {visibleRuns.map((run, index) => {
                  const timeAgo = formatDistanceToNow(new Date(run.createdAt), { addSuffix: true });
                  const styles = getStatusStyles(run.status);
                  const isFailed = run.status === 'failed';
                  const isFirst = index === 0;
                  const isExpanded = expandedId === run.id;
                  const hasDetails = !!(run.logs || run.output);

                  return (
                    <div
                      key={run.id}
                      className={`group relative rounded-xs border transition-all duration-300 ${styles.bg} ${
                        isFirst
                          ? 'border-primary/20 shadow-sm hover:shadow-md hover:border-primary/30'
                          : 'border-border/50 hover:border-border hover:shadow-sm'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : run.id)}
                        className="w-full text-left"
                        disabled={!hasDetails}
                      >
                        <div className="flex items-start gap-3 px-4 py-3">
                          {/* Status indicator dot with glow */}
                          <div
                            className={`h-2 w-2 rounded-full flex-shrink-0 mt-1.5 ${styles.dot}`}
                          />

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <p className="text-sm text-foreground font-medium truncate">
                                  {run.evidenceAutomation.name}
                                </p>
                                {run.version ? (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    v{run.version}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    draft
                                  </Badge>
                                )}
                              </div>
                              {hasDetails && (
                                <ChevronDown
                                  className={`h-4 w-4 text-muted-foreground transition-transform duration-700 ease-in-out ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                />
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className={`font-medium ${styles.text}`}>
                                {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                              </span>
                              {run.evaluationStatus && (
                                <>
                                  <span className="text-[10px]">•</span>
                                  <Badge
                                    variant={
                                      run.evaluationStatus === 'pass' ? 'default' : 'destructive'
                                    }
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {run.evaluationStatus === 'pass' ? '✓ Pass' : '✗ Fail'}
                                  </Badge>
                                </>
                              )}
                              <span className="text-[10px]">•</span>
                              <span>{timeAgo}</span>
                              {run.triggeredBy && (
                                <>
                                  <span className="text-[10px]">•</span>
                                  <span className="capitalize font-medium">{run.triggeredBy}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Expandable details with CSS grid animation */}
                      <div
                        className={`grid transition-all duration-700 ease-in-out ${
                          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="px-4 pb-3 pt-3 space-y-3 border-t border-border/50">
                            {/* Evaluation Reason */}
                            {run.evaluationReason && (
                              <div className="space-y-1.5">
                                <div className="flex items-center">
                                  <p className="text-xs font-medium">Evaluation</p>
                                </div>
                                <p className="text-xs text-foreground leading-relaxed">
                                  {run.evaluationReason}
                                </p>
                              </div>
                            )}

                            {/* Logs */}
                            {run.logs && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Logs</p>
                                <pre className="text-xs bg-muted/50 p-2 rounded-xs overflow-x-auto max-h-40 overflow-y-auto font-mono">
                                  {typeof run.logs === 'string'
                                    ? run.logs
                                    : JSON.stringify(run.logs, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* Output */}
                            {run.output && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Output</p>
                                <pre className="text-xs bg-muted/50 p-2 rounded-xs overflow-x-auto max-h-40 overflow-y-auto font-mono">
                                  {typeof run.output === 'string'
                                    ? run.output
                                    : JSON.stringify(run.output, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* Error message if failed */}
                            {isFailed && run.error && (
                              <div className="px-2 py-1.5 rounded-xs bg-chart-destructive/10 border border-chart-destructive/20">
                                <p className="text-xs text-chart-destructive/90">{run.error}</p>
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
              {showAll ? 'Show less' : `Show ${runs.length - 3} more`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
