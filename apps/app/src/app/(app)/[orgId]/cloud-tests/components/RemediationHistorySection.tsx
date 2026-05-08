'use client';

import { useApi } from '@/hooks/use-api';
import { Button, Section, Stack, Text } from '@trycompai/design-system';
import { RecentlyViewed, Undo } from '@trycompai/design-system/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { Copy, ExternalLink, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface RemediationActionItem {
  id: string;
  remediationKey: string;
  resourceId: string;
  resourceType: string;
  status: string;
  riskLevel: string | null;
  errorMessage: string | null;
  initiatedById: string;
  initiatedByName: string | null;
  executedAt: string | null;
  rolledBackAt: string | null;
  createdAt: string;
}

const STATUS_BADGE: Record<string, { variant: 'default' | 'destructive' | 'outline' | 'secondary'; label: string }> = {
  success: { variant: 'default', label: 'Success' },
  failed: { variant: 'destructive', label: 'Failed' },
  rolled_back: { variant: 'outline', label: 'Rolled Back' },
  rollback_failed: { variant: 'destructive', label: 'Rollback Failed' },
  executing: { variant: 'secondary', label: 'Executing' },
};

function formatRemediationKey(key: string): string {
  // Extract a clean, short description from the finding key
  // e.g., "cloudwatch-cloudwatch-no-cloudtrail-integration-cloudtrail-not-integrated-with-cloudwatch-logs"
  // → "CloudTrail not integrated with CloudWatch Logs"
  const parts = key.split('-');
  // Skip the service prefix (first 1-2 parts that repeat)
  const seen = new Set<string>();
  const meaningful = parts.filter((p) => {
    const lower = p.toLowerCase();
    if (seen.has(lower) || lower.length <= 2) return false;
    seen.add(lower);
    return true;
  });
  if (meaningful.length === 0) return key;
  return meaningful
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const getInitials = (name: string | null) =>
  name
    ? name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)
    : 'S';

function RemediationRow({
  action,
  onRollback,
}: {
  action: RemediationActionItem;
  onRollback: (action: RemediationActionItem) => void;
}) {
  const displayName = action.initiatedByName ?? 'System';
  const timeAgo = formatDistanceToNow(new Date(action.executedAt ?? action.createdAt), {
    addSuffix: true,
  });
  const badge = STATUS_BADGE[action.status] ?? STATUS_BADGE.executing;
  const canRollback = action.status === 'success';
  const hasError =
    action.errorMessage &&
    (action.status === 'failed' || action.status === 'rollback_failed');

  return (
    <div className="flex items-center gap-2">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${badge.variant === 'default' ? 'bg-emerald-500' : badge.variant === 'destructive' ? 'bg-red-500' : 'bg-gray-400'}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <span className="font-medium">{displayName}</span>
          {' '}
          <span className="text-muted-foreground">applied {formatRemediationKey(action.remediationKey)}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
      </div>
      {canRollback && (
        <button
          type="button"
          onClick={() => onRollback(action)}
          className="shrink-0 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Rollback
        </button>
      )}
    </div>
  );
}

function RollbackConfirmDialog({
  action,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  permError,
  providerSlug,
}: {
  action: RemediationActionItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
  permError?: { missingActions: string[]; script: string } | null;
  providerSlug?: string;
}) {
  if (!action) return null;

  const friendlyKey = formatRemediationKey(action.remediationKey);
  const appliedAt = action.executedAt
    ? formatDistanceToNow(new Date(action.executedAt), { addSuffix: true })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Rollback</DialogTitle>
          <DialogDescription>
            This will undo the fix and revert your {providerSlug === 'azure' ? 'Azure' : providerSlug === 'gcp' ? 'GCP' : 'AWS'} infrastructure to its previous state.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
          <p className="text-sm font-medium">{friendlyKey}</p>
          {appliedAt && (
            <p className="text-xs text-muted-foreground">Applied {appliedAt}</p>
          )}
        </div>

        {/* Permission error for rollback */}
        {permError && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-medium">Missing permissions for rollback</p>
            <div className="flex flex-wrap gap-1">
              {permError.missingActions.map((a) => (
                <span key={a} className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono text-foreground/70">{a}</span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(permError.script);
                  toast.success('Script copied');
                }}
                className="inline-flex items-center gap-1 rounded border bg-background px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="h-2.5 w-2.5" />
                Copy Script
              </button>
              <a
                href={providerSlug === 'azure' ? 'https://portal.azure.com/#cloudshell/' : providerSlug === 'gcp' ? 'https://console.cloud.google.com/cloudshell' : 'https://console.aws.amazon.com/cloudshell'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded border bg-background px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                {providerSlug === 'azure' ? 'Azure Shell' : providerSlug === 'gcp' ? 'Cloud Shell' : 'CloudShell'}
              </a>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? 'Rolling back...' : permError ? 'Retry Rollback' : 'Rollback'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RemediationHistorySection({ connectionId, providerSlug }: { connectionId: string; providerSlug?: string }) {
  const api = useApi();
  const [rollbackTarget, setRollbackTarget] = useState<RemediationActionItem | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackPermError, setRollbackPermError] = useState<{
    missingActions: string[];
    script: string;
  } | null>(null);

  const { data, isLoading, mutate } = api.useSWR<{ data: RemediationActionItem[]; count: number }>(
    connectionId ? `/v1/cloud-security/remediation/actions?connectionId=${connectionId}` : null,
    { revalidateOnFocus: false },
  );

  const allActions = Array.isArray(data?.data?.data) ? data.data.data : (Array.isArray(data?.data) ? data.data : []);
  const actions = allActions.filter((a) => a.status !== 'failed' && a.status !== 'executing');

  const handleRollback = async () => {
    if (!rollbackTarget) return;
    setIsRollingBack(true);
    setRollbackPermError(null);
    try {
      const response = await api.post<{
        status?: string;
        message?: string;
        missingActions?: string[];
        script?: string;
      }>(
        `/v1/cloud-security/remediation/${rollbackTarget.id}/rollback`,
        {},
      );
      if (response.error) {
        // Check for structured permission error
        const errData = response.data;
        if (errData?.missingActions && errData.script) {
          setRollbackPermError({
            missingActions: errData.missingActions,
            script: errData.script,
          });
          return;
        }
        toast.error(typeof response.error === 'string' ? response.error : 'Rollback failed');
        return;
      }
      toast.success('Remediation rolled back successfully');
      setRollbackTarget(null);
      await mutate();
    } catch {
      toast.error('Rollback failed');
    } finally {
      setIsRollingBack(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <Section title="Remediations">
        <div className="py-8">
          <Stack gap="sm" align="center">
            <RecentlyViewed size={20} className="text-muted-foreground/50" />
            <Text size="xs" variant="muted">
              No remediations have been performed yet
            </Text>
          </Stack>
        </div>
      </Section>
    );
  }

  return (
    <>
      <Section title="Remediations">
        <div className="divide-y [&>*]:py-2.5">
          {actions.map((action) => (
            <RemediationRow
              key={action.id}
              action={action}
              onRollback={setRollbackTarget}
            />
          ))}
        </div>
      </Section>

      <RollbackConfirmDialog
        action={rollbackTarget}
        open={Boolean(rollbackTarget)}
        providerSlug={providerSlug}
        onOpenChange={(open) => {
          if (!open) {
            setRollbackTarget(null);
            setRollbackPermError(null);
          }
        }}
        onConfirm={handleRollback}
        isLoading={isRollingBack}
        permError={rollbackPermError}
      />
    </>
  );
}
