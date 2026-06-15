'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@trycompai/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { StoredCheckRun } from '../hooks/useIntegrationChecks';
import { groupRunsByConnection } from './check-run-grouping';
import { EvidenceJsonView } from './EvidenceJsonView';

/**
 * Run history for a check, grouped by the account (connection) it ran against.
 *
 * With a single account this renders identically to the previous date-grouped
 * history (no account header). With multiple accounts — e.g. a customer who
 * connected several AWS accounts — each account gets its own labelled section
 * showing that account's runs, so the one check surfaces results + logs for
 * every account. Both manual and scheduled runs flow through here.
 */
export function AccountRunGroups({
  runs,
  organizationName,
}: {
  runs: StoredCheckRun[];
  organizationName: string;
}) {
  const groups = useMemo(() => groupRunsByConnection(runs), [runs]);

  if (groups.length <= 1) {
    return <GroupedCheckRuns runs={runs} organizationName={organizationName} />;
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const latest = group.runs[0];
        const hasFailed = latest ? latest.status === 'failed' || latest.failedCount > 0 : false;
        return (
          <div key={group.connectionId} className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full flex-shrink-0',
                  hasFailed ? 'bg-destructive' : 'bg-primary',
                )}
              />
              <span className="text-xs font-semibold text-foreground">{group.label}</span>
              {latest && (
                <span className="text-[11px] text-muted-foreground">
                  {latest.passedCount} passed
                  {latest.failedCount > 0 ? `, ${latest.failedCount} issues` : ''}
                </span>
              )}
            </div>
            <GroupedCheckRuns runs={group.runs} maxRuns={3} organizationName={organizationName} />
          </div>
        );
      })}
    </div>
  );
}

// Group runs by date for display
export function GroupedCheckRuns({
  runs,
  maxRuns = 5,
  organizationName,
}: {
  runs: StoredCheckRun[];
  maxRuns?: number;
  organizationName: string;
}) {
  const [showAll, setShowAll] = useState(false);

  // Get the runs to display (limited or all)
  const displayRuns = showAll ? runs : runs.slice(0, maxRuns);
  const hasMore = runs.length > maxRuns;

  // Build grouped display from displayRuns
  const displayGrouped = useMemo((): Record<string, StoredCheckRun[]> => {
    const groups: Record<string, StoredCheckRun[]> = {};

    displayRuns.forEach((run) => {
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
  }, [displayRuns]);

  if (runs.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-2">No runs yet</p>;
  }

  let runIndex = 0;

  return (
    <div className="space-y-4">
      {Object.entries(displayGrouped).map(([date, dateRuns]) => (
        <div key={date} className="space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {date}
          </p>
          <div className="space-y-2">
            {dateRuns.map((run: StoredCheckRun) => {
              const isLatest = runIndex === 0;
              runIndex++;
              return (
                <CheckRunItem
                  key={run.id}
                  run={run}
                  isLatest={isLatest}
                  organizationName={organizationName}
                />
              );
            })}
          </div>
        </div>
      ))}

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          {showAll ? 'Show less' : `Show ${runs.length - maxRuns} more runs`}
        </button>
      )}
    </div>
  );
}

// Individual check run item with expandable details
export function CheckRunItem({
  run,
  isLatest,
  organizationName,
}: {
  run: StoredCheckRun;
  isLatest: boolean;
  organizationName: string;
}) {
  const [expanded, setExpanded] = useState(isLatest);

  const timeAgo = formatDistanceToNow(new Date(run.createdAt), { addSuffix: true });
  const hasFailed = run.status === 'failed' || run.failedCount > 0;
  const hasError = run.status === 'failed' && run.errorMessage;

  // Excepted findings are surfaced separately (not as red issues) so the row
  // matches the run's status, which the API already computes excluding them.
  const findings = run.results.filter((r) => !r.passed && !r.excepted);
  const excepted = run.results.filter((r) => r.excepted);
  const passing = run.results.filter((r) => r.passed);

  const statusColor = hasError ? 'text-destructive' : hasFailed ? 'text-warning' : 'text-primary';

  const statusText = hasError ? 'Error' : hasFailed ? 'Issues Found' : 'Passed';

  return (
    <div
      className={cn(
        'rounded-md border transition-all',
        isLatest ? 'border-primary/20 bg-primary/[0.02]' : 'border-border/30 bg-muted/20',
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2.5 flex items-center gap-3"
      >
        <div
          className={cn(
            'h-1.5 w-1.5 rounded-full flex-shrink-0',
            hasError ? 'bg-destructive' : hasFailed ? 'bg-warning' : 'bg-primary',
          )}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className={cn('font-medium', statusColor)}>{statusText}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{timeAgo}</span>
            {run.failedCount > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-destructive">{run.failedCount} failed</span>
              </>
            )}
            {run.passedCount > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-primary">{run.passedCount} passed</span>
              </>
            )}
          </div>
        </div>

        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-muted-foreground transition-transform duration-300',
            expanded && 'rotate-180',
          )}
        />
      </button>

      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/30">
            {/* Error */}
            {run.errorMessage && (
              <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-destructive">{run.errorMessage}</p>
              </div>
            )}

            {/* Findings */}
            {findings.length > 0 && (
              <div className="space-y-2">
                {findings.slice(0, 3).map((finding) => (
                  <div key={finding.id} className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{finding.title}</p>
                      {finding.description && (
                        <p className="text-sm text-muted-foreground mt-1">{finding.description}</p>
                      )}
                      {finding.remediation && (
                        <p className="text-sm text-primary mt-2">{finding.remediation}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {finding.resourceId}
                        </Badge>
                        {finding.severity && (
                          <Badge variant="outline" className="text-xs">
                            {finding.severity}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {finding.evidence && Object.keys(finding.evidence).length > 0 && (
                      <details className="text-xs">
                        <summary className="text-muted-foreground cursor-pointer">
                          View Evidence
                        </summary>
                        <EvidenceJsonView
                          evidence={finding.evidence}
                          organizationName={organizationName}
                          automationName={run.checkName}
                        />
                      </details>
                    )}
                  </div>
                ))}
                {findings.length > 3 && (
                  <p className="text-sm text-muted-foreground">
                    +{findings.length - 3} more issues
                  </p>
                )}
              </div>
            )}

            {/* Excepted - failing findings the customer marked as an exception.
                Shown muted (not an issue) so it's clear the exception applied. */}
            {excepted.length > 0 && (
              <div className="space-y-2">
                {excepted.slice(0, 3).map((finding) => (
                  <div key={finding.id}>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-muted-foreground">{finding.title}</p>
                      <Badge variant="outline" className="text-xs">
                        Exception
                      </Badge>
                    </div>
                    <div className="mt-1">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {finding.resourceId}
                      </Badge>
                    </div>
                  </div>
                ))}
                {excepted.length > 3 && (
                  <p className="text-sm text-muted-foreground">
                    +{excepted.length - 3} more excepted
                  </p>
                )}
              </div>
            )}

            {/* Passing Results - always show when there are passing results */}
            {passing.length > 0 && (
              <details className="text-xs" open={findings.length === 0}>
                <summary className="text-sm font-medium text-primary cursor-pointer flex items-center gap-2">
                  <span>✓ {passing.length} passed</span>
                </summary>
                <div className="mt-2 space-y-2 pl-4 border-l-2 border-primary/20">
                  {passing.slice(0, 3).map((result) => (
                    <div key={result.id} className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{result.title}</p>
                        {result.description && (
                          <p className="text-sm text-muted-foreground mt-1">{result.description}</p>
                        )}
                        <Badge variant="secondary" className="mt-2 font-mono text-xs">
                          {result.resourceId}
                        </Badge>
                      </div>
                      {result.evidence && Object.keys(result.evidence).length > 0 && (
                        <details className="text-xs">
                          <summary className="text-muted-foreground cursor-pointer">
                            View Evidence
                          </summary>
                          <EvidenceJsonView
                            evidence={result.evidence}
                            organizationName={organizationName}
                            automationName={run.checkName}
                          />
                        </details>
                      )}
                    </div>
                  ))}
                  {passing.length > 3 && (
                    <p className="text-sm text-muted-foreground">
                      +{passing.length - 3} more passed
                    </p>
                  )}
                </div>
              </details>
            )}

            {/* Logs */}
            {run.logs && run.logs.length > 0 && (
              <details className="text-xs">
                <summary className="text-muted-foreground cursor-pointer">Logs</summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                  {run.logs.map((log, i) => (
                    <div
                      key={i}
                      className={cn(
                        log.level === 'error' && 'text-destructive',
                        log.level === 'warn' && 'text-warning',
                      )}
                    >
                      <span className="opacity-50">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>{' '}
                      {log.message}
                    </div>
                  ))}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
