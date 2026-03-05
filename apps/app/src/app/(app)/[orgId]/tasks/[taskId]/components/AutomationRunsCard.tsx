'use client';

import { Badge } from '@comp/ui/badge';
import { EvidenceAutomationRun, EvidenceAutomationRunStatus } from '@db';
import { Stack, Text, Button } from '@trycompai/design-system';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';

type AutomationRunWithName = EvidenceAutomationRun & {
  evidenceAutomation: {
    name: string;
  };
};

interface AutomationRunsCardProps {
  runs: AutomationRunWithName[];
}

const getStatusStyles = (status: EvidenceAutomationRunStatus) => {
  switch (status) {
    case 'completed':
      return { dot: 'bg-primary', text: 'text-primary', bg: 'bg-primary/15' };
    case 'failed':
      return { dot: 'bg-destructive', text: 'text-destructive', bg: 'bg-destructive/15' };
    case 'running':
      return { dot: 'bg-info animate-pulse', text: 'text-info', bg: 'bg-info/15' };
    case 'pending':
      return { dot: 'bg-warning', text: 'text-warning', bg: 'bg-warning/15' };
    case 'cancelled':
      return { dot: 'bg-muted-foreground', text: 'text-muted-foreground', bg: 'bg-muted/15' };
  }
};

export function AutomationRunsCard({ runs }: AutomationRunsCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const groupedRuns = useMemo(() => {
    const groups: Record<string, AutomationRunWithName[]> = {};
    runs?.forEach((run) => {
      const date = new Date(run.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(run);
    });
    return groups;
  }, [runs]);

  if (!runs || runs.length === 0) {
    return (
      <div className="py-8">
        <Stack gap="sm" align="center">
          <Text size="sm" variant="muted">No runs yet</Text>
          <Text size="xs" variant="muted">Runs will appear here once automations are executed</Text>
        </Stack>
      </div>
    );
  }

  const hasMore = runs.length > 5;
  const displayedGroups = showAll ? groupedRuns : Object.fromEntries(Object.entries(groupedRuns).slice(0, 3));

  return (
    <Stack gap="lg">
      {Object.entries(displayedGroups).map(([date, dateRuns]) => (
        <Stack key={date} gap="sm">
          <Text size="xs" weight="medium" variant="muted">{date}</Text>
          <Stack gap="xs">
            {dateRuns.map((run) => {
              const timeAgo = formatDistanceToNow(new Date(run.createdAt), { addSuffix: true });
              const isFailed = run.status === 'failed' || run.evaluationStatus === 'fail';
              const styles = isFailed ? getStatusStyles('failed') : getStatusStyles(run.status);
              const isExpanded = expandedId === run.id;
              const hasDetails = !!(run.logs || run.output || run.evaluationReason || (run.status === 'failed' && run.error));

              return (
                <div
                  key={run.id}
                  className={`rounded-lg border border-border hover:border-border/80 transition-colors ${styles.bg}`}
                  onClick={() => hasDetails && setExpandedId(isExpanded ? null : run.id)}
                  role={hasDetails ? 'button' : undefined}
                  style={hasDetails ? { cursor: 'pointer' } : undefined}
                >
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${styles.dot}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Text size="sm" weight="medium" as="span">{run.evidenceAutomation.name}</Text>
                        {run.version ? (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">v{run.version}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">draft</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-xs font-medium ${styles.text}`}>
                          {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                        </span>
                        {run.evaluationStatus && (
                          <>
                            <span className="text-xs text-muted-foreground">·</span>
                            <Badge
                              variant={run.evaluationStatus === 'pass' ? 'default' : 'destructive'}
                              className="text-[10px] px-1.5 py-0 !text-white"
                            >
                              {run.evaluationStatus === 'pass' ? 'Pass' : 'Fail'}
                            </Badge>
                          </>
                        )}
                        <span className="text-xs text-muted-foreground">·</span>
                        <Text size="xs" variant="muted" as="span">{timeAgo}</Text>
                        {run.triggeredBy && (
                          <>
                            <span className="text-xs text-muted-foreground">·</span>
                            <Text size="xs" variant="muted" as="span" style={{ textTransform: 'capitalize' }}>{run.triggeredBy}</Text>
                          </>
                        )}
                      </div>
                    </div>

                    {hasDetails && (
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    )}
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-3 pt-2 border-t space-y-2">
                      {run.evaluationReason && (
                        <div>
                          <Text size="xs" weight="medium" variant="muted">Evaluation</Text>
                          <Text size="xs" as="p">{run.evaluationReason}</Text>
                        </div>
                      )}
                      {run.logs && (
                        <div>
                          <Text size="xs" weight="medium" variant="muted">Logs</Text>
                          <pre className="text-xs bg-muted text-foreground p-2 rounded overflow-x-auto max-h-40 overflow-y-auto font-mono mt-1">
                            {typeof run.logs === 'string' ? run.logs : JSON.stringify(run.logs, null, 2)}
                          </pre>
                        </div>
                      )}
                      {run.output && (
                        <div>
                          <Text size="xs" weight="medium" variant="muted">Output</Text>
                          <pre className="text-xs bg-muted text-foreground p-2 rounded overflow-x-auto max-h-40 overflow-y-auto font-mono mt-1">
                            {typeof run.output === 'string' ? run.output : JSON.stringify(run.output, null, 2)}
                          </pre>
                        </div>
                      )}
                      {run.status === 'failed' && run.error && (
                        <div className="px-2 py-1.5 rounded bg-destructive/10 border border-destructive/20">
                          <Text size="xs" variant="destructive">{run.error}</Text>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </Stack>
        </Stack>
      ))}

      {hasMore && (
        <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show less' : `Show all ${runs.length} runs`}
        </Button>
      )}
    </Stack>
  );
}
