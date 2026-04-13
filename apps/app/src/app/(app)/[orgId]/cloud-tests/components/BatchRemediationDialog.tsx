'use client';

import { Badge } from '@trycompai/ui/badge';
import { Button } from '@trycompai/ui/button';
import { Checkbox } from '@trycompai/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  ShieldAlert,
  SkipForward,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import {
  startBatchFix,
  cancelBatchFix,
  skipBatchFinding,
  retryFinding,
} from '../actions/batch-fix';

interface Finding {
  id: string;
  title: string | null;
  key: string;
  severity: string;
}

interface BatchRemediationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  findings: Finding[];
  connectionId: string;
  organizationId: string;
  onComplete?: () => void;
  /** Called when the trigger run starts — parent uses this to enable the floating pill. */
  onRunStarted?: (info: { batchId: string; triggerRunId: string; accessToken: string }) => void;
  /** Resume an active batch (loaded on page mount). */
  activeBatch?: {
    batchId: string;
    triggerRunId: string;
    accessToken: string;
    findings: Array<{ id: string; title: string; status: string; error?: string }>;
  } | null;
}

type FindingStatus = 'pending' | 'fixing' | 'fixed' | 'needs_permissions' | 'skipped' | 'failed' | 'cancelled';

interface FindingProgress {
  id: string;
  key?: string;
  title: string;
  severity?: string;
  status: FindingStatus;
  error?: string;
  missingPermissions?: string[];
}

interface BatchProgress {
  current: number;
  total: number;
  fixed: number;
  skipped: number;
  failed: number;
  findings: FindingProgress[];
  phase: 'running' | 'retrying' | 'scanning' | 'waiting_for_permissions' | 'done' | 'cancelled';
  permChecksLeft?: number;
}

const STATUS_CONFIG: Record<FindingStatus, { icon: typeof Check; color: string; bg: string }> = {
  pending: { icon: Loader2, color: 'text-muted-foreground/40', bg: '' },
  fixing: { icon: Loader2, color: 'text-primary', bg: 'bg-primary/[0.04]' },
  fixed: { icon: Check, color: 'text-emerald-500', bg: '' },
  needs_permissions: { icon: ShieldAlert, color: 'text-muted-foreground', bg: '' },
  skipped: { icon: SkipForward, color: 'text-muted-foreground', bg: '' },
  failed: { icon: X, color: 'text-red-500', bg: '' },
  cancelled: { icon: X, color: 'text-muted-foreground', bg: '' },
};

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-blue-400',
  info: 'bg-gray-300',
};

/** Per-finding inline permissions with copy/cloudshell/retry. */
function FindingPermissions({
  permissions,
  onRetry,
}: {
  permissions: string[];
  onRetry: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Group by service
  const grouped = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const p of permissions) {
      const [svc, action] = p.split(':');
      if (svc && action) (groups[svc] ??= []).push(action);
    }
    return groups;
  }, [permissions]);

  const script = [
    'ROLE="CompAI-Remediator" POLICY="CompAI-BatchPermissions"',
    `NEW='${JSON.stringify(permissions)}'`,
    'CUR=$(aws iam get-role-policy --role-name "$ROLE" --policy-name "$POLICY" --query \'PolicyDocument.Statement[0].Action\' --output json 2>/dev/null || echo \'[]\')',
    'MERGED=$(echo "$CUR $NEW" | jq -s \'add | unique\')',
    'aws iam put-role-policy --role-name "$ROLE" --policy-name "$POLICY" --policy-document "{\\"Version\\":\\"2012-10-17\\",\\"Statement\\":[{\\"Effect\\":\\"Allow\\",\\"Action\\":$MERGED,\\"Resource\\":\\"*\\"}]}"',
  ].join('\n');

  return (
    <div className="ml-[30px] mt-1.5 space-y-1.5">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {Object.entries(grouped).map(([svc, actions]) => (
          <div key={svc} className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground font-medium">{svc}:</span>
            {actions.map((a) => (
              <span key={a} className="rounded bg-muted px-1 py-0.5 text-[9px] font-mono text-foreground/70">{a}</span>
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(script);
            setCopied(true);
            toast.success('Script copied');
            setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex items-center gap-1 rounded border bg-background px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <a
          href="https://console.aws.amazon.com/cloudshell"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded border bg-background px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          CloudShell
        </a>
        <button
          type="button"
          onClick={async () => {
            setRetrying(true);
            await onRetry();
            setRetrying(false);
          }}
          disabled={retrying}
          className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          {retrying ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <RefreshCw className="h-2.5 w-2.5" />}
          {retrying ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    </div>
  );
}

/** Consolidated banner — shows permissions grouped by AWS service, merge-safe script. */
function MissingPermsBanner({
  findings,
  confirmedPermissions,
}: {
  findings: FindingProgress[];
  confirmedPermissions: string[];
}) {
  const [copied, setCopied] = useState(false);
  const confirmed = useMemo(() => new Set(confirmedPermissions), [confirmedPermissions]);

  // Group by AWS service
  const grouped = useMemo(() => {
    const perms = new Set<string>();
    for (const f of findings) {
      if (f.missingPermissions) {
        for (const p of f.missingPermissions) {
          if (!confirmed.has(p)) perms.add(p);
        }
      }
    }
    const groups: Record<string, string[]> = {};
    for (const p of [...perms].sort()) {
      const [svc, action] = p.split(':');
      if (!svc || !action) continue;
      (groups[svc] ??= []).push(action);
    }
    return groups;
  }, [findings, confirmed]);

  const allMissing = Object.entries(grouped).flatMap(([svc, actions]) =>
    actions.map((a) => `${svc}:${a}`),
  );

  if (allMissing.length === 0) return null;

  // Merge-safe script: reads existing policy, merges new permissions, writes combined
  // Uses jq (available in AWS CloudShell) to avoid overwriting existing perms
  const newPermsJson = JSON.stringify(allMissing);
  const script = [
    '# Merge new permissions with existing (won\'t overwrite)',
    'ROLE="CompAI-Remediator"',
    'POLICY="CompAI-BatchPermissions"',
    `NEW_PERMS='${newPermsJson}'`,
    '',
    '# Get existing permissions (empty array if policy doesn\'t exist yet)',
    'EXISTING=$(aws iam get-role-policy --role-name "$ROLE" --policy-name "$POLICY" \\',
    '  --query \'PolicyDocument.Statement[0].Action\' --output json 2>/dev/null || echo \'[]\')',
    '',
    '# Merge and deduplicate',
    'MERGED=$(echo "$EXISTING $NEW_PERMS" | jq -s \'add | unique\')',
    '',
    '# Apply combined policy',
    'aws iam put-role-policy --role-name "$ROLE" --policy-name "$POLICY" \\',
    '  --policy-document "{\\"Version\\":\\"2012-10-17\\",\\"Statement\\":[{\\"Effect\\":\\"Allow\\",\\"Action\\":$MERGED,\\"Resource\\":\\"*\\"}]}"',
    '',
    'echo "Added $(echo $NEW_PERMS | jq length) permissions ($(echo $MERGED | jq length) total)"',
  ].join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    toast.success('Permission script copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const serviceCount = Object.keys(grouped).length;

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
      <div className="flex items-start gap-2.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted mt-0.5">
          <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium">
            {allMissing.length} permission{allMissing.length !== 1 ? 's' : ''} needed across {serviceCount} service{serviceCount !== 1 ? 's' : ''}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Run the script below — it merges with existing permissions, nothing gets overwritten.
          </p>
        </div>
      </div>

      {/* Grouped by service */}
      <div className="ml-[34px] space-y-1.5">
        {Object.entries(grouped).map(([svc, actions]) => (
          <div key={svc} className="flex items-start gap-2">
            <span className="text-[10px] font-medium text-muted-foreground w-20 shrink-0 pt-0.5 text-right">{svc}</span>
            <div className="flex flex-wrap gap-1">
              {actions.map((a) => (
                <span key={a} className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono text-foreground/70">
                  {a}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 ml-[34px]">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy Script'}
        </button>
        <a
          href="https://console.aws.amazon.com/cloudshell"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          CloudShell
        </a>
      </div>
    </div>
  );
}

export function BatchRemediationDialog({
  open,
  onOpenChange,
  serviceName,
  findings,
  connectionId,
  organizationId,
  onComplete,
  onRunStarted,
  activeBatch,
}: BatchRemediationDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [acknowledged, setAcknowledged] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Resume active batch if provided
  useEffect(() => {
    if (activeBatch && open) {
      setBatchId(activeBatch.batchId);
      setRunId(activeBatch.triggerRunId);
      setAccessToken(activeBatch.accessToken);
    }
  }, [activeBatch, open]);

  // Real-time task progress
  const { run } = useRealtimeRun(runId ?? '', {
    accessToken: accessToken ?? undefined,
    enabled: Boolean(runId && accessToken),
  });

  const progress = (run?.metadata as { progress?: BatchProgress } | undefined)
    ?.progress ?? null;

  // Detect if the trigger run itself is finished (cancelled, failed, completed)
  const runStatus = run?.status;
  const runFinished = runStatus === 'COMPLETED' || runStatus === 'FAILED' || runStatus === 'CANCELED' || runStatus === 'SYSTEM_FAILURE';

  const isRunning = Boolean(runId) && !runFinished && (!progress || progress.phase === 'running' || progress.phase === 'retrying');
  const isWaitingPerms = progress?.phase === 'waiting_for_permissions';
  const isScanning = progress?.phase === 'scanning';
  const isDone = progress?.phase === 'done' || progress?.phase === 'cancelled' || runFinished;

  // Reset on open
  useEffect(() => {
    if (open && !activeBatch) {
      setSelected(new Set(findings.map((f) => f.id)));
      setAcknowledged(false);
      setBatchId(null);
      setRunId(null);
      setAccessToken(null);
      setCancelling(false);
    }
  }, [open, findings, activeBatch]);

  // Auto-complete + auto-close when all findings are fixed
  useEffect(() => {
    if (isDone && progress && progress.fixed > 0) {
      onComplete?.();
      // Auto-close if everything succeeded (no failures or skips)
      const allFixed = progress.failed === 0 && progress.skipped === 0;
      if (allFixed) {
        const timer = setTimeout(() => onOpenChange(false), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isDone, progress, onComplete, onOpenChange]);

  // Findings with progress (from task metadata or initial list)
  const findingsWithProgress = useMemo((): FindingProgress[] => {
    if (progress?.findings) return progress.findings;
    if (activeBatch?.findings) {
      return activeBatch.findings.map((f) => ({
        id: f.id,
        title: f.title,
        status: (f.status as FindingStatus) || 'pending',
        error: f.error,
      }));
    }
    if (runId) {
      return findings
        .filter((f) => selected.has(f.id))
        .map((f) => ({ id: f.id, title: f.title ?? 'Untitled', status: 'pending' as FindingStatus }));
    }
    return [];
  }, [progress, runId, findings, selected, activeBatch]);

  const handleToggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    if (selected.size === findings.length) setSelected(new Set());
    else setSelected(new Set(findings.map((f) => f.id)));
  }, [selected.size, findings]);

  const handleStart = async () => {
    const selectedFindings = findings
      .filter((f) => selected.has(f.id))
      .map((f) => ({ id: f.id, key: f.key, title: f.title ?? 'Untitled' }));
    if (selectedFindings.length === 0) return;

    setStarting(true);
    const result = await startBatchFix({
      organizationId,
      connectionId,
      findings: selectedFindings,
    });
    setStarting(false);

    if (result.error || !result.data) return;

    setBatchId(result.data.batchId);
    setRunId(result.data.runId);
    setAccessToken(result.data.accessToken);
    onRunStarted?.({
      batchId: result.data.batchId,
      triggerRunId: result.data.runId,
      accessToken: result.data.accessToken,
    });
  };

  const handleCancel = async () => {
    if (!runId || !batchId) return;
    setCancelling(true);
    await cancelBatchFix(runId, batchId);
  };

  const handleSkipFinding = async (findingId: string) => {
    if (!batchId) return;
    await skipBatchFinding(batchId, findingId);
  };

  // Retry: create a new batch with only the skipped/failed findings
  const handleRetrySkipped = async () => {
    const retryFindings = findingsWithProgress
      .filter((f) => f.status === 'skipped' || f.status === 'failed')
      .map((f) => {
        const orig = findings.find((o) => o.id === f.id);
        return orig ? { id: orig.id, key: orig.key, title: orig.title ?? 'Untitled' } : null;
      })
      .filter((f): f is { id: string; key: string; title: string } => f !== null);

    if (retryFindings.length === 0) return;

    setStarting(true);
    const result = await startBatchFix({ organizationId, connectionId, findings: retryFindings });
    setStarting(false);

    if (result.error || !result.data) return;

    setBatchId(result.data.batchId);
    setRunId(result.data.runId);
    setAccessToken(result.data.accessToken);
    onRunStarted?.({
      batchId: result.data.batchId,
      triggerRunId: result.data.runId,
      accessToken: result.data.accessToken,
    });
  };

  const handleClose = () => {
    // Allow close even while running — task continues in background
    onOpenChange(false);
  };

  const selectedCount = selected.size;
  const allSelected = selectedCount === findings.length;
  const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0;
  const hasSkippedOrFailed = findingsWithProgress.some(
    (f) => f.status === 'skipped' || f.status === 'failed' || f.status === 'needs_permissions',
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="w-full max-h-[85vh] overflow-hidden flex flex-col"
        style={{ maxWidth: '32rem' }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Fix All — {serviceName}
          </DialogTitle>
          <DialogDescription>
            {runId
              ? `Processing ${progress?.total ?? selectedCount} findings`
              : `${selectedCount} finding${selectedCount !== 1 ? 's' : ''} selected for auto-fix`}
          </DialogDescription>
        </DialogHeader>

        {/* ─── Pre-start: Selection ─── */}
        {!runId && (
          <>
            <div className="flex items-center gap-2 border-b pb-2">
              <Checkbox checked={allSelected} onCheckedChange={handleToggleAll} id="select-all" />
              <label htmlFor="select-all" className="text-xs font-medium text-muted-foreground cursor-pointer select-none">
                {allSelected ? 'Deselect all' : 'Select all'}
              </label>
              <span className="ml-auto text-xs text-muted-foreground">{selectedCount} selected</span>
            </div>

            <div className="overflow-y-auto max-h-[40vh] -mx-1 px-1 space-y-0.5">
              {findings.map((f) => (
                <label
                  key={f.id}
                  className="flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-muted/40 cursor-pointer transition-colors"
                >
                  <Checkbox checked={selected.has(f.id)} onCheckedChange={() => handleToggle(f.id)} />
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[f.severity.toLowerCase()] ?? 'bg-gray-300'}`} />
                  <span className="text-sm truncate min-w-0 flex-1">{f.title ?? 'Untitled'}</span>
                  <Badge variant="outline" className="shrink-0 text-[9px]">{f.severity}</Badge>
                </label>
              ))}
            </div>

            <div className="space-y-3 border-t pt-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <Checkbox checked={acknowledged} onCheckedChange={(v) => setAcknowledged(v === true)} className="mt-0.5" />
                <span className="text-xs leading-relaxed text-muted-foreground">
                  I have reviewed the findings above and understand this will modify my cloud infrastructure.
                </span>
              </label>
              <Button onClick={handleStart} disabled={!acknowledged || selectedCount === 0 || starting} className="w-full">
                {starting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {starting ? 'Starting...' : `Fix ${selectedCount} Finding${selectedCount !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </>
        )}

        {/* ─── In-progress / Done ─── */}
        {runId && (
          <>
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${isDone ? 'bg-emerald-500' : 'bg-primary'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {isScanning ? 'Re-scanning to verify...'
                    : isDone ? (progress?.phase === 'cancelled' ? 'Cancelled' : 'Complete')
                    : isWaitingPerms ? `Waiting for permissions... (${progress?.permChecksLeft ?? 0} checks left)`
                    : progress?.phase === 'retrying' ? 'Retrying with new permissions...'
                    : `Fixing ${progress?.current ?? 0} of ${progress?.total ?? selectedCount}...`}
                </span>
                <div className="flex gap-3">
                  {(progress?.fixed ?? 0) > 0 && <span className="text-emerald-600">{progress!.fixed} fixed</span>}
                  {(progress?.skipped ?? 0) > 0 && <span className="text-amber-600">{progress!.skipped} skipped</span>}
                  {(progress?.failed ?? 0) > 0 && <span className="text-red-600">{progress!.failed} failed</span>}
                </div>
              </div>
            </div>

            {/* Finding progress list */}
            <div className="overflow-y-auto max-h-[45vh] -mx-1 px-1 space-y-0.5">
              {findingsWithProgress.map((f) => {
                const config = STATUS_CONFIG[f.status] ?? STATUS_CONFIG.pending;
                const Icon = config.icon;
                const canSkip = f.status === 'pending' && !isDone;
                const isMissingPerms = f.status === 'needs_permissions' && f.missingPermissions && f.missingPermissions.length > 0;

                return (
                  <div
                    key={f.id}
                    className={`group rounded-md px-2.5 py-2 transition-all duration-300 ${config.bg}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                        <Icon className={`h-3.5 w-3.5 ${config.color} ${f.status === 'fixing' ? 'animate-spin' : ''}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm truncate ${f.status === 'fixing' ? 'font-medium' : f.status === 'pending' ? 'text-muted-foreground' : ''}`}>
                          {f.title}
                        </p>
                        {f.error && !isMissingPerms && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{f.error}</p>
                        )}
                      </div>
                      {canSkip && (
                        <button
                          type="button"
                          onClick={() => handleSkipFinding(f.id)}
                          className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Skip this finding"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      {f.status === 'fixed' && <span className="text-[10px] text-emerald-600 font-medium shrink-0">Done</span>}
                      {f.status === 'cancelled' && <span className="text-[10px] text-muted-foreground shrink-0">Removed</span>}
                    </div>
                    {/* Per-finding permissions — only shows for THIS finding */}
                    {isMissingPerms && (
                      <FindingPermissions
                        permissions={f.missingPermissions!}
                        onRetry={async () => {
                          // Find the original finding data for key
                          const orig = findings.find((o) => o.id === f.id);
                          if (!orig) return;
                          const result = await retryFinding(connectionId, f.id, orig.key);
                          if (result.status === 'fixed') {
                            toast.success(`Fixed: ${f.title}`);
                            onComplete?.();
                          } else if (result.status === 'needs_permissions') {
                            toast.error('Still missing permissions');
                          } else {
                            toast.error(result.error ?? 'Retry failed');
                          }
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 border-t pt-3">
              {!isDone && !isScanning && (
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelling}>
                  {cancelling ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <X className="h-3 w-3 mr-1.5" />}
                  {cancelling ? 'Cancelling...' : 'Cancel All'}
                </Button>
              )}
              {isScanning && (
                <Button variant="outline" size="sm" disabled>
                  <RefreshCw className="h-3 w-3 animate-spin mr-1.5" />
                  Re-scanning...
                </Button>
              )}
              {isDone && hasSkippedOrFailed && (
                <Button variant="outline" size="sm" onClick={handleRetrySkipped} disabled={starting}>
                  {starting ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <RefreshCw className="h-3 w-3 mr-1.5" />}
                  Retry Skipped
                </Button>
              )}
              {isDone && (
                <Button size="sm" onClick={() => onOpenChange(false)}>
                  Done
                </Button>
              )}
              {!isDone && (
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                  Minimize
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
