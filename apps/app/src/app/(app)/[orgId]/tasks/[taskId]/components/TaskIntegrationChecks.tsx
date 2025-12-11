'use client';

import { ConnectIntegrationDialog } from '@/components/integrations/ConnectIntegrationDialog';
import { ManageIntegrationDialog } from '@/components/integrations/ManageIntegrationDialog';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { addDays, formatDistanceToNow, isBefore, setHours, setMinutes } from 'date-fns';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Loader2,
  Play,
  PlugZap,
  Settings2,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

interface TaskIntegrationCheck {
  integrationId: string;
  integrationName: string;
  integrationLogoUrl: string;
  checkId: string;
  checkName: string;
  checkDescription: string;
  isConnected: boolean;
  needsConfiguration: boolean;
  connectionId?: string;
  connectionStatus?: string;
  authType?: 'oauth2' | 'custom' | 'api_key' | 'basic' | 'jwt';
  oauthConfigured?: boolean;
}

interface StoredCheckRun {
  id: string;
  checkId: string;
  checkName: string;
  status: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totalChecked: number;
  passedCount: number;
  failedCount: number;
  errorMessage?: string;
  logs?: Array<{
    level: string;
    message: string;
    data?: Record<string, unknown>;
    timestamp: string;
  }>;
  provider: {
    slug: string;
    name: string;
  };
  results: Array<{
    id: string;
    passed: boolean;
    resourceType: string;
    resourceId: string;
    title: string;
    description?: string;
    severity?: string;
    remediation?: string;
    evidence?: Record<string, unknown>;
    collectedAt: string;
  }>;
  createdAt: string;
}

interface TaskIntegrationChecksProps {
  taskId: string;
  onTaskUpdated?: () => void;
}

export function TaskIntegrationChecks({ taskId, onTaskUpdated }: TaskIntegrationChecksProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgId = params.orgId as string;

  const [checks, setChecks] = useState<TaskIntegrationCheck[]>([]);
  const [storedRuns, setStoredRuns] = useState<StoredCheckRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState<string | null>(null);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // OAuth success handling - open config dialog after successful connection
  const [configureDialogOpen, setConfigureDialogOpen] = useState(false);
  const [configureConnection, setConfigureConnection] = useState<{
    connectionId: string;
    integrationId: string;
    integrationName: string;
    integrationLogoUrl: string;
    checkName?: string;
    checkDescription?: string;
  } | null>(null);
  const hasHandledOAuthRef = useRef(false);

  // Handle OAuth callback success - find the newly connected integration and open config dialog
  useEffect(() => {
    if (hasHandledOAuthRef.current || loading) return;

    const success = searchParams.get('success');
    const providerSlug = searchParams.get('provider');

    if (success === 'true' && providerSlug && checks.length > 0) {
      hasHandledOAuthRef.current = true;

      // Find the connected check for this provider
      const connectedCheck = checks.find(
        (c) => c.integrationId === providerSlug && c.isConnected && c.connectionId,
      );

      if (connectedCheck) {
        // Open the configure dialog
        setConfigureConnection({
          connectionId: connectedCheck.connectionId!,
          integrationId: connectedCheck.integrationId,
          integrationName: connectedCheck.integrationName,
          integrationLogoUrl: connectedCheck.integrationLogoUrl,
        });
        setConfigureDialogOpen(true);
        toast.success(
          `${connectedCheck.integrationName} connected! Configure it to start automated checks.`,
        );
      }

      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      url.searchParams.delete('provider');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, checks, loading]);

  // Fetch checks and historical runs for this task
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [checksResponse, runsResponse] = await Promise.all([
          api.get<{
            checks: TaskIntegrationCheck[];
            task: { id: string; title: string; templateId: string | null };
          }>(`/v1/integrations/tasks/${taskId}/checks?organizationId=${orgId}`),
          api.get<{ runs: StoredCheckRun[] }>(
            `/v1/integrations/tasks/${taskId}/runs?organizationId=${orgId}`,
          ),
        ]);

        if (checksResponse.data?.checks) {
          setChecks(checksResponse.data.checks);
        }
        if (runsResponse.data?.runs) {
          setStoredRuns(runsResponse.data.runs);
        }
      } catch (err) {
        console.error('Failed to fetch app automations:', err);
        setError('Failed to load app automations');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [taskId, orgId]);

  const refreshRuns = useCallback(async () => {
    try {
      const runsResponse = await api.get<{ runs: StoredCheckRun[] }>(
        `/v1/integrations/tasks/${taskId}/runs?organizationId=${orgId}`,
      );
      if (runsResponse.data?.runs) {
        setStoredRuns(runsResponse.data.runs);
      }
    } catch (err) {
      console.error('Failed to refresh runs:', err);
    }
  }, [taskId, orgId]);

  const refreshChecks = useCallback(async () => {
    try {
      const checksResponse = await api.get<{
        checks: TaskIntegrationCheck[];
        task: { id: string; title: string; templateId: string | null };
      }>(`/v1/integrations/tasks/${taskId}/checks?organizationId=${orgId}`);
      if (checksResponse.data?.checks) {
        setChecks(checksResponse.data.checks);
      }
    } catch (err) {
      console.error('Failed to refresh checks:', err);
    }
  }, [taskId, orgId]);

  const handleRunCheck = useCallback(
    async (connectionId: string, checkId: string) => {
      setRunningCheck(checkId);
      setExpandedCheck(checkId); // Auto-expand when running
      setError(null);
      try {
        const response = await api.post<{
          success: boolean;
          error?: string;
          checkRunId?: string;
          taskStatus?: string | null;
        }>(`/v1/integrations/tasks/${taskId}/run-check?organizationId=${orgId}`, {
          connectionId,
          checkId,
        });

        const data = response.data;
        if (data?.success) {
          await refreshRuns();
          // Refresh task data if status was updated
          if (data.taskStatus && onTaskUpdated) {
            onTaskUpdated();
          }
        } else if (data?.error) {
          setError(data.error);
        }
      } catch (err) {
        console.error('Failed to run check:', err);
        setError('Failed to run check');
      } finally {
        setRunningCheck(null);
      }
    },
    [taskId, orgId, refreshRuns, onTaskUpdated],
  );

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <PlugZap className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-[10px] font-semibold text-foreground uppercase tracking-[0.15em]">
            App Automations
          </h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  const connectedChecks = checks.filter((c) => c.isConnected);
  const disconnectedChecks = checks.filter((c) => !c.isConnected);

  // If there are no checks at all for this task, don't render anything
  if (checks.length === 0) {
    return null;
  }

  // Group runs by check
  const runsByCheck = storedRuns.reduce(
    (acc, run) => {
      if (!acc[run.checkId]) {
        acc[run.checkId] = [];
      }
      acc[run.checkId].push(run);
      return acc;
    },
    {} as Record<string, StoredCheckRun[]>,
  );

  // Calculate overall metrics
  const totalRuns = storedRuns.length;
  const successfulRuns = storedRuns.filter(
    (r) => r.status === 'success' && r.failedCount === 0,
  ).length;
  const failedRuns = storedRuns.filter((r) => r.status === 'failed' || r.failedCount > 0).length;
  const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;

  // Calculate next scheduled run (daily at 6 AM UTC)
  const getNextScheduledRun = () => {
    const now = new Date();
    let nextRun = setMinutes(setHours(new Date(), 6), 0); // 6:00 AM UTC today

    // If we're past 6 AM UTC today, schedule for tomorrow
    if (isBefore(nextRun, now)) {
      nextRun = addDays(nextRun, 1);
    }

    return nextRun;
  };

  const nextRun = connectedChecks.length > 0 ? getNextScheduledRun() : null;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Card Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-muted">
              <PlugZap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">App Automations</h3>
              <p className="text-xs text-muted-foreground">
                Pre-built automations from connected integrations
              </p>
            </div>
          </div>
          {connectedChecks.length > 0 && nextRun && (
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Next run
              </div>
              <div className="text-sm font-medium text-foreground">
                {formatDistanceToNow(nextRun, { addSuffix: true })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5">
        {connectedChecks.length === 0 && disconnectedChecks.length === 0 ? (
          <IntegrationEmptyState
            disconnectedChecks={disconnectedChecks}
            hasNoMappedChecks={true}
            orgId={orgId}
            taskId={taskId}
          />
        ) : connectedChecks.length === 0 ? (
          <IntegrationEmptyState
            disconnectedChecks={disconnectedChecks}
            hasNoMappedChecks={false}
            orgId={orgId}
            taskId={taskId}
          />
        ) : (
          <div className="space-y-5">
            {/* Metrics Summary */}
            {totalRuns > 0 && (
              <div className="border-b border-border/40 pb-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Runs */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground uppercase tracking-[0.1em] font-medium">
                        Total Runs
                      </span>
                    </div>
                    <div className="text-xl font-semibold text-foreground tabular-nums">
                      {totalRuns}
                    </div>
                  </div>

                  {/* Success Rate */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[9px] text-muted-foreground uppercase tracking-[0.1em] font-medium">
                        Success Rate
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-xl font-semibold text-foreground tabular-nums">
                        {successRate}%
                      </div>
                      <div className="flex-1 max-w-[60px] bg-muted/50 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-500"
                          style={{ width: `${successRate}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Failed */}
                  {failedRuns > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                        <span className="text-[9px] text-muted-foreground uppercase tracking-[0.1em] font-medium">
                          Issues
                        </span>
                      </div>
                      <div className="text-xl font-semibold text-destructive tabular-nums">
                        {failedRuns}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* Connected Checks List */}
            <div className="space-y-2">
              {connectedChecks.map((check) => {
                const checkRuns = runsByCheck[check.checkId] || [];
                const latestRun = checkRuns[0]; // Already sorted by createdAt desc
                const isRunning = runningCheck === check.checkId;
                const isExpanded = expandedCheck === check.checkId;
                const needsConfig = check.needsConfiguration;

                // Determine status from latest run
                const hasFailed = latestRun
                  ? latestRun.status === 'failed' || latestRun.failedCount > 0
                  : false;
                const hasSucceeded = latestRun
                  ? latestRun.status === 'success' && latestRun.failedCount === 0
                  : false;

                const dotColor = needsConfig
                  ? 'bg-warning shadow-[0_0_8px_hsl(var(--warning)/0.4)]'
                  : hasFailed
                    ? 'bg-destructive shadow-[0_0_8px_rgba(255,0,0,0.3)]'
                    : hasSucceeded
                      ? 'bg-primary shadow-[0_0_8px_rgba(0,77,64,0.4)]'
                      : 'bg-muted-foreground';

                const lastRan = latestRun
                  ? formatDistanceToNow(new Date(latestRun.completedAt || latestRun.createdAt), {
                      addSuffix: true,
                    })
                  : null;

                return (
                  <div
                    key={`${check.integrationId}-${check.checkId}`}
                    className={cn(
                      'rounded-lg border transition-all duration-300',
                      needsConfig
                        ? 'border-warning/30 bg-warning/5'
                        : isExpanded
                          ? 'border-primary/30 shadow-sm bg-primary/[0.02]'
                          : 'border-border/50 hover:border-border',
                    )}
                  >
                    {/* Needs Configuration Banner */}
                    {needsConfig && (
                      <button
                        onClick={() => {
                          setConfigureConnection({
                            connectionId: check.connectionId!,
                            integrationId: check.integrationId,
                            integrationName: check.integrationName,
                            integrationLogoUrl: check.integrationLogoUrl,
                          });
                          setConfigureDialogOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 bg-warning/10 border-b border-warning/20 text-left hover:bg-warning/15 transition-colors"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                        <span className="text-xs text-warning-foreground font-medium">
                          Configuration required
                        </span>
                        <Settings2 className="h-3 w-3 text-warning ml-auto shrink-0" />
                      </button>
                    )}

                    {/* Check Header Row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="relative shrink-0">
                        <Image
                          src={check.integrationLogoUrl}
                          alt={check.integrationName}
                          width={24}
                          height={24}
                          className="rounded"
                        />
                        <div
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background',
                            dotColor,
                            isRunning && 'animate-pulse',
                          )}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground text-sm tracking-tight">
                            {check.checkName}
                          </p>
                        </div>
                        {needsConfig ? (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Configure required settings to enable this check
                          </p>
                        ) : lastRan ? (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Last ran {lastRan}
                            {latestRun && (
                              <span className="ml-2">
                                • {latestRun.passedCount} passed
                                {latestRun.failedCount > 0 && (
                                  <span className="text-destructive">
                                    , {latestRun.failedCount} issues
                                  </span>
                                )}
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-0.5">Not run yet</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {needsConfig ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 border-warning/30 text-warning hover:bg-warning/10"
                            onClick={() => {
                              setConfigureConnection({
                                connectionId: check.connectionId!,
                                integrationId: check.integrationId,
                                integrationName: check.integrationName,
                                integrationLogoUrl: check.integrationLogoUrl,
                                checkName: check.checkName,
                                checkDescription: check.checkDescription,
                              });
                              setConfigureDialogOpen(true);
                            }}
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                            <span className="ml-1.5 text-xs">Configure</span>
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-3"
                              disabled={isRunning}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRunCheck(check.connectionId!, check.checkId);
                              }}
                            >
                              {isRunning ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Play className="h-3.5 w-3.5" />
                              )}
                              <span className="ml-1.5 text-xs">Run</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setConfigureConnection({
                                  connectionId: check.connectionId!,
                                  integrationId: check.integrationId,
                                  integrationName: check.integrationName,
                                  integrationLogoUrl: check.integrationLogoUrl,
                                  checkName: check.checkName,
                                  checkDescription: check.checkDescription,
                                });
                                setConfigureDialogOpen(true);
                              }}
                            >
                              <Settings2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {checkRuns.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => setExpandedCheck(isExpanded ? null : check.checkId)}
                          >
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 transition-transform duration-300',
                                isExpanded && 'rotate-180',
                              )}
                            />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Run History */}
                    <div
                      className={cn(
                        'grid transition-all duration-500 ease-in-out',
                        isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-4">
                          <GroupedCheckRuns runs={checkRuns} maxRuns={5} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Disconnected Checks as Suggestions */}
            {disconnectedChecks.length > 0 && (
              <div className="pt-4 border-t border-border/40">
                <p className="text-xs font-medium text-muted-foreground mb-3">
                  More integrations available
                </p>
                <div className="space-y-1">
                  {disconnectedChecks.map((check) => (
                    <Link
                      key={`${check.integrationId}-${check.checkId}`}
                      href={`/${orgId}/integrations`}
                      className={cn(
                        'flex flex-row items-center justify-between py-2 px-3 rounded-md',
                        'hover:bg-muted/50 transition-colors',
                        'cursor-pointer group',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Image
                          src={check.integrationLogoUrl}
                          alt={check.integrationName}
                          width={20}
                          height={20}
                          className="rounded opacity-50 group-hover:opacity-100 transition-opacity"
                        />
                        <div>
                          <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                            {check.checkName}
                          </p>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Configure Integration Dialog - opens after OAuth success or when clicking Configure */}
      {configureConnection && (
        <ManageIntegrationDialog
          open={configureDialogOpen}
          onOpenChange={setConfigureDialogOpen}
          connectionId={configureConnection.connectionId}
          integrationId={configureConnection.integrationId}
          integrationName={configureConnection.integrationName}
          integrationLogoUrl={configureConnection.integrationLogoUrl}
          configureOnly={true}
          checkContext={
            configureConnection.checkName
              ? {
                  checkName: configureConnection.checkName,
                  checkDescription: configureConnection.checkDescription,
                }
              : undefined
          }
          onSaved={() => {
            // Refresh the checks data after saving to update needsConfiguration status
            refreshChecks();
            setConfigureDialogOpen(false);
            setConfigureConnection(null);
          }}
        />
      )}
    </div>
  );
}

// Group runs by date for display
function GroupedCheckRuns({ runs, maxRuns = 5 }: { runs: StoredCheckRun[]; maxRuns?: number }) {
  const [showAll, setShowAll] = useState(false);

  // Group runs by date
  const groupedRuns = useMemo(() => {
    const groups: Record<string, StoredCheckRun[]> = {};

    runs.forEach((run) => {
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
              return <CheckRunItem key={run.id} run={run} isLatest={isLatest} />;
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
function CheckRunItem({ run, isLatest }: { run: StoredCheckRun; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(isLatest);

  const timeAgo = formatDistanceToNow(new Date(run.createdAt), { addSuffix: true });
  const hasFailed = run.status === 'failed' || run.failedCount > 0;
  const hasError = run.status === 'failed' && run.errorMessage;

  const findings = run.results.filter((r) => !r.passed);
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
                  </div>
                ))}
                {findings.length > 3 && (
                  <p className="text-sm text-muted-foreground">
                    +{findings.length - 3} more issues
                  </p>
                )}
              </div>
            )}

            {/* Passing Results */}
            {passing.length > 0 && findings.length === 0 && (
              <div className="space-y-2">
                {passing.slice(0, 2).map((result) => (
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
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(result.evidence, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
                {passing.length > 2 && (
                  <p className="text-sm text-muted-foreground">+{passing.length - 2} more passed</p>
                )}
              </div>
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

// Empty state when no integrations are connected - matches AutomationEmptyState style
function IntegrationEmptyState({
  disconnectedChecks,
  hasNoMappedChecks,
  orgId,
  taskId,
}: {
  disconnectedChecks: TaskIntegrationCheck[];
  hasNoMappedChecks: boolean;
  orgId: string;
  taskId?: string;
}) {
  const params = useParams();
  const router = useRouter();
  const currentTaskId = taskId || (params.taskId as string);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Dialog state for connecting integrations
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<TaskIntegrationCheck | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let time = 0;
    const animate = () => {
      time += 0.005;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Primary color: hsl(165, 100%, 15%) = rgb(0, 77, 64)
      const primaryR = 0;
      const primaryG = 77;
      const primaryB = 64;

      ctx.strokeStyle = `rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.06)`;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const y = (canvas.height / 4) * (i + 1);
        const wave = Math.sin(time + i) * 10;
        ctx.moveTo(0, y + wave);
        for (let x = 0; x < canvas.width; x += 15) {
          const waveY = Math.sin((x / canvas.width) * Math.PI * 2 + time + i) * 8;
          ctx.lineTo(x, y + wave + waveY);
        }
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Get unique integrations from disconnected checks
  const uniqueIntegrations = Array.from(
    new Map(disconnectedChecks.map((c) => [c.integrationId, c])).values(),
  );

  const handleConnectClick = (integration: TaskIntegrationCheck) => {
    setSelectedIntegration(integration);
    setConnectDialogOpen(true);
  };

  const handleAutomationClick = () => {
    router.push(`/${orgId}/tasks/${currentTaskId}/automation/new`);
  };

  // If no mapped checks, show simple automation CTA
  if (hasNoMappedChecks) {
    return (
      <div
        className="relative overflow-hidden border-t-2 border-t-primary/20 bg-primary/2 py-8 px-6 group hover:border-t-primary/30 hover:bg-primary/4 transition-all cursor-pointer"
        onClick={handleAutomationClick}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full opacity-10"
          style={{ mixBlendMode: 'multiply' }}
        />

        <div className="relative z-10 text-center space-y-3">
          <div className="inline-flex">
            <div className="w-12 h-12 rounded-md bg-primary/8 flex items-center justify-center mx-auto group-hover:bg-primary/12 transition-colors">
              <Bot className="w-6 h-6 text-primary" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-base font-semibold text-foreground tracking-tight">
              Automate This Task
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              No pre-built integrations are available. Launch an AI agent that continuously
              collects, verifies, and refreshes evidence for this requirement.
            </p>
          </div>

          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-5 py-4">
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Has disconnected integrations available
  return (
    <>
      <div className="relative overflow-hidden border-t-2 border-t-primary/20 bg-primary/2 group hover:border-t-primary/30 hover:bg-primary/4 transition-all">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full opacity-10"
          style={{ mixBlendMode: 'multiply' }}
        />

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center py-6 px-6">
            <div className="inline-flex mb-3 gap-2">
              {uniqueIntegrations.slice(0, 3).map((integration) => (
                <div
                  key={integration.integrationId}
                  className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden"
                >
                  <Image
                    src={integration.integrationLogoUrl}
                    alt={integration.integrationName}
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
              ))}
              {uniqueIntegrations.length > 3 && (
                <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center text-xs font-medium text-muted-foreground">
                  +{uniqueIntegrations.length - 3}
                </div>
              )}
            </div>

            <h4 className="text-base font-semibold text-foreground tracking-tight">
              Automate This Task
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed mt-1.5">
              Connect an integration to automatically verify compliance, or build a custom
              automation
            </p>
          </div>

          {/* Options */}
          <div className="border-t border-primary/10 divide-y divide-primary/10">
            {/* Pre-built integrations */}
            {uniqueIntegrations.map((integration) => {
              const checksForIntegration = disconnectedChecks.filter(
                (c) => c.integrationId === integration.integrationId,
              );
              // Check if OAuth integration is not yet configured by platform admin
              const isComingSoon =
                integration.authType === 'oauth2' && integration.oauthConfigured === false;

              if (isComingSoon) {
                return (
                  <div
                    key={integration.integrationId}
                    className="w-full flex items-center gap-4 px-6 py-3 opacity-60 cursor-not-allowed"
                  >
                    <div className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 overflow-hidden">
                      <Image
                        src={integration.integrationLogoUrl}
                        alt={integration.integrationName}
                        width={20}
                        height={20}
                        className="object-contain grayscale"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">
                        {integration.integrationName}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {checksForIntegration.length} automated check
                        {checksForIntegration.length > 1 ? 's' : ''} available
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      Coming Soon
                    </Badge>
                  </div>
                );
              }

              return (
                <button
                  key={integration.integrationId}
                  onClick={() => handleConnectClick(integration)}
                  className="w-full flex items-center gap-4 px-6 py-3 hover:bg-primary/5 transition-colors group/item text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 overflow-hidden">
                    <Image
                      src={integration.integrationLogoUrl}
                      alt={integration.integrationName}
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover/item:text-primary transition-colors">
                      Connect {integration.integrationName}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {checksForIntegration.length} automated check
                      {checksForIntegration.length > 1 ? 's' : ''} available
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover/item:text-primary transition-colors shrink-0" />
                </button>
              );
            })}

            {/* Custom automation option */}
            <Link
              href={`/${orgId}/tasks/${currentTaskId}/automation/new`}
              className="flex items-center gap-4 px-6 py-3 hover:bg-primary/5 transition-colors group/item"
            >
              <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 group-hover/item:bg-muted transition-colors">
                <Bot className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground group-hover/item:text-foreground/80 transition-colors">
                  Build Custom Automation
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Use the AI agent to create a tailored automation
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover/item:text-foreground/80 transition-colors shrink-0" />
            </Link>
          </div>
        </div>
      </div>

      {/* Connect Integration Dialog */}
      {selectedIntegration && (
        <ConnectIntegrationDialog
          open={connectDialogOpen}
          onOpenChange={setConnectDialogOpen}
          integrationId={selectedIntegration.integrationId}
          integrationName={selectedIntegration.integrationName}
          integrationLogoUrl={selectedIntegration.integrationLogoUrl}
        />
      )}
    </>
  );
}
