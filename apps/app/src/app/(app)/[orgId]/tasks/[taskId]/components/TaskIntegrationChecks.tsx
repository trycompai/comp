'use client';

import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Separator } from '@comp/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Loader2,
  Play,
  PlugZap,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

interface TaskIntegrationCheck {
  integrationId: string;
  integrationName: string;
  checkId: string;
  checkName: string;
  checkDescription: string;
  isConnected: boolean;
  connectionId?: string;
  connectionStatus?: string;
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
}

export function TaskIntegrationChecks({ taskId }: TaskIntegrationChecksProps) {
  const params = useParams();
  const orgId = params.orgId as string;

  const [checks, setChecks] = useState<TaskIntegrationCheck[]>([]);
  const [storedRuns, setStoredRuns] = useState<StoredCheckRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState<string | null>(null);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        console.error('Failed to fetch integration checks:', err);
        setError('Failed to load integration checks');
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
        }>(`/v1/integrations/tasks/${taskId}/run-check?organizationId=${orgId}`, {
          connectionId,
          checkId,
        });

        const data = response.data;
        if (data?.success) {
          await refreshRuns();
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
    [taskId, orgId, refreshRuns],
  );

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <PlugZap className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-[10px] font-semibold text-foreground uppercase tracking-[0.15em]">
            Integration Checks
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
  const failedRuns = storedRuns.filter(
    (r) => r.status === 'failed' || r.failedCount > 0,
  ).length;
  const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <PlugZap className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-[10px] font-semibold text-foreground uppercase tracking-[0.15em]">
          Integration Checks
        </h3>
      </div>

      <div>
        {connectedChecks.length === 0 && disconnectedChecks.length === 0 ? (
          <IntegrationEmptyState
            disconnectedChecks={disconnectedChecks}
            hasNoMappedChecks={true}
            orgId={orgId}
          />
        ) : connectedChecks.length === 0 ? (
          <IntegrationEmptyState
            disconnectedChecks={disconnectedChecks}
            hasNoMappedChecks={false}
            orgId={orgId}
          />
        ) : (
          <div className="space-y-4">
            {/* Metrics Summary */}
            {totalRuns > 0 && (
              <div className="border-t border-border/50 pt-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

                  {totalRuns > 0 && (
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
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      {failedRuns > 0 ? (
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      ) : successfulRuns > 0 ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full bg-muted-foreground/30" />
                      )}
                      <span className="text-[9px] text-muted-foreground uppercase tracking-[0.1em] font-medium">
                        Health
                      </span>
                    </div>
                    <div className="text-xl font-semibold text-foreground tabular-nums">
                      {successfulRuns > 0 && (
                        <span className="text-primary">{successfulRuns}</span>
                      )}
                      {successfulRuns > 0 && failedRuns > 0 && (
                        <span className="text-muted-foreground/50 mx-1">/</span>
                      )}
                      {failedRuns > 0 && (
                        <span className="text-destructive">{failedRuns}</span>
                      )}
                      {successfulRuns === 0 && failedRuns === 0 && (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </div>
                  </div>
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

                // Determine status from latest run
                const hasFailed = latestRun
                  ? latestRun.status === 'failed' || latestRun.failedCount > 0
                  : false;
                const hasSucceeded = latestRun
                  ? latestRun.status === 'success' && latestRun.failedCount === 0
                  : false;

                const dotColor = hasFailed
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
                      isExpanded
                        ? 'border-primary/30 shadow-sm bg-primary/[0.02]'
                        : 'border-border/50 hover:border-border',
                    )}
                  >
                    {/* Check Header Row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div
                        className={cn(
                          'h-2.5 w-2.5 rounded-full flex-shrink-0',
                          dotColor,
                          isRunning && 'animate-pulse',
                        )}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground text-sm tracking-tight">
                            {check.checkName}
                          </p>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {check.integrationName}
                          </Badge>
                        </div>
                        {lastRan ? (
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

                        {checkRuns.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() =>
                              setExpandedCheck(isExpanded ? null : check.checkId)
                            }
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
                        <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-3">
                          {checkRuns.slice(0, 5).map((run, idx) => (
                            <CheckRunItem key={run.id} run={run} isLatest={idx === 0} />
                          ))}
                          {checkRuns.length > 5 && (
                            <p className="text-[10px] text-muted-foreground text-center py-1">
                              +{checkRuns.length - 5} older runs
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Disconnected Checks as Suggestions */}
            {disconnectedChecks.length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.1em]">
                    Available Integrations
                  </p>
                  {disconnectedChecks.map((check) => (
                    <Link
                      key={`${check.integrationId}-${check.checkId}`}
                      href={`/${orgId}/integrations/platform-test`}
                      className={cn(
                        'flex flex-row items-center justify-between py-2 px-1',
                        'hover:bg-muted/30 transition-colors',
                        'cursor-pointer group opacity-60 hover:opacity-100',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full flex-shrink-0 bg-muted-foreground/30" />
                        <div>
                          <p className="text-sm text-foreground">{check.checkName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Connect {check.integrationName} to enable
                          </p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
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

  const statusColor = hasError
    ? 'text-destructive'
    : hasFailed
      ? 'text-yellow-600'
      : 'text-primary';

  const statusText = hasError
    ? 'Error'
    : hasFailed
      ? 'Issues Found'
      : 'Passed';

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
            hasError
              ? 'bg-destructive'
              : hasFailed
                ? 'bg-yellow-500'
                : 'bg-primary',
          )}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className={cn('font-medium', statusColor)}>{statusText}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-primary" />
              {run.passedCount}
            </span>
            {run.failedCount > 0 && (
              <span className="text-muted-foreground flex items-center gap-1">
                <XCircle className="h-3 w-3 text-destructive" />
                {run.failedCount}
              </span>
            )}
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{timeAgo}</span>
            {run.durationMs && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground font-mono">{run.durationMs}ms</span>
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
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-destructive uppercase tracking-wide flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Issues ({findings.length})
                </p>
                {findings.slice(0, 3).map((finding) => (
                  <div
                    key={finding.id}
                    className="p-2 rounded-md bg-destructive/5 border border-destructive/10"
                  >
                    <p className="text-xs font-medium text-foreground">{finding.title}</p>
                    {finding.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {finding.description}
                      </p>
                    )}
                    {finding.remediation && (
                      <p className="text-[11px] text-primary mt-1">💡 {finding.remediation}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span className="font-mono">{finding.resourceId}</span>
                      {finding.severity && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                          {finding.severity}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {findings.length > 3 && (
                  <p className="text-[10px] text-muted-foreground">
                    +{findings.length - 3} more
                  </p>
                )}
              </div>
            )}

            {/* Passing Results */}
            {passing.length > 0 && findings.length === 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-primary uppercase tracking-wide flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Evidence ({passing.length})
                </p>
                {passing.slice(0, 2).map((result) => (
                  <div
                    key={result.id}
                    className="p-2 rounded-md bg-primary/5 border border-primary/10"
                  >
                    <p className="text-xs font-medium text-foreground">{result.title}</p>
                    {result.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {result.description}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                      {result.resourceId}
                    </p>
                    {result.evidence && Object.keys(result.evidence).length > 0 && (
                      <details className="mt-1.5">
                        <summary className="text-[10px] cursor-pointer text-primary font-medium">
                          View evidence
                        </summary>
                        <pre className="mt-1 p-1.5 bg-muted/50 rounded text-[9px] overflow-x-auto max-h-24 overflow-y-auto font-mono">
                          {JSON.stringify(result.evidence, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
                {passing.length > 2 && (
                  <p className="text-[10px] text-muted-foreground">+{passing.length - 2} more</p>
                )}
              </div>
            )}

            {/* Logs */}
            {run.logs && run.logs.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground font-medium text-[10px]">
                  Logs ({run.logs.length})
                </summary>
                <pre className="mt-1 p-2 bg-muted/50 rounded text-[9px] overflow-x-auto max-h-32 overflow-y-auto font-mono">
                  {run.logs.map((log, i) => (
                    <div
                      key={i}
                      className={cn(
                        log.level === 'error' && 'text-destructive',
                        log.level === 'warn' && 'text-yellow-600',
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

// Empty state when no integrations are connected
function IntegrationEmptyState({
  disconnectedChecks,
  hasNoMappedChecks,
  orgId,
}: {
  disconnectedChecks: TaskIntegrationCheck[];
  hasNoMappedChecks: boolean;
  orgId: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

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

  return (
    <Link
      href={`/${orgId}/integrations/platform-test`}
      className="block relative overflow-hidden border-t-2 border-t-primary/20 bg-primary/[0.02] py-8 px-6 group hover:border-t-primary/30 hover:bg-primary/[0.04] transition-all cursor-pointer"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-10"
        style={{ mixBlendMode: 'multiply' }}
      />

      <div className="relative z-10 text-center space-y-3">
        <div className="inline-flex">
          <div className="w-12 h-12 rounded-md bg-primary/8 flex items-center justify-center mx-auto group-hover:bg-primary/12 transition-colors">
            <PlugZap className="w-6 h-6 text-primary" />
          </div>
        </div>

        <div className="space-y-1.5">
          <h4 className="text-base font-semibold text-foreground tracking-tight">
            {hasNoMappedChecks ? 'No Checks Available' : 'Connect Integrations'}
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {hasNoMappedChecks
              ? 'No integration checks are mapped to this task template yet'
              : 'Connect integrations to automatically verify compliance for this task'}
          </p>
        </div>

        {disconnectedChecks.length > 0 && (
          <div className="pt-2">
            <p className="text-[10px] text-muted-foreground mb-2">
              {disconnectedChecks.length} integration
              {disconnectedChecks.length > 1 ? 's' : ''} available:
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {disconnectedChecks.slice(0, 3).map((check) => (
                <Badge
                  key={`${check.integrationId}-${check.checkId}`}
                  variant="secondary"
                  className="text-[10px]"
                >
                  {check.integrationName}
                </Badge>
              ))}
              {disconnectedChecks.length > 3 && (
                <Badge variant="outline" className="text-[10px]">
                  +{disconnectedChecks.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-5 py-4">
          Connect
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </Link>
  );
}
