'use client';

import { Badge, Button, Text } from '@trycompai/design-system';
import { useState } from 'react';
import { toast } from 'sonner';
import { useFrameworkSyncHistory } from '@/hooks/use-framework-sync-history';
import { useFrameworkRollback } from '@/hooks/use-framework-rollback';
import { hasPermission } from '@/lib/permissions';
import type { UserPermissions } from '@/lib/permissions';
import type { SyncHistoryItem } from '@/types/framework-versioning';
import { RollbackConfirmDialog } from './RollbackConfirmDialog';

interface SyncHistorySectionProps {
  frameworkInstanceId: string;
  permissions: UserPermissions;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isWithinRollbackWindow(item: SyncHistoryItem): boolean {
  if (!item.rollbackExpiresAt) return false;
  return new Date(item.rollbackExpiresAt) > new Date();
}

function canRollbackItem(item: SyncHistoryItem): boolean {
  return (
    item.kind === 'SYNC' &&
    !item.rolledBackByOperationId &&
    isWithinRollbackWindow(item)
  );
}

interface HistoryItemRowProps {
  item: SyncHistoryItem;
  showRollback: boolean;
  onRollback: (syncOperationId: string) => void;
  isRollingBack: boolean;
}

function HistoryItemRow({
  item,
  showRollback,
  onRollback,
  isRollingBack,
}: HistoryItemRowProps) {
  const isSync = item.kind === 'SYNC';
  const wasRolledBack = !!item.rolledBackByOperationId;
  const actorName = item.performedBy?.user?.name
    ?? item.performedBy?.user?.email
    ?? null;
  const actionVerb = isSync ? 'Synced' : 'Rolled back';

  return (
    <div className="flex items-start justify-between gap-4 rounded-md border px-4 py-3">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant={isSync ? 'secondary' : 'outline'}>
            {isSync ? 'Sync' : 'Rollback'}
          </Badge>
          <Text size="sm" weight="medium">
            v{item.fromVersion.version} → v{item.toVersion.version}
          </Text>
          {wasRolledBack && (
            <Badge variant="outline">Rolled back</Badge>
          )}
        </div>
        <Text size="sm" variant="muted">
          {actionVerb}{actorName ? ` by ${actorName}` : ''} on {formatDate(item.performedAt)}
        </Text>
        {item.rollbackExpiresAt && isWithinRollbackWindow(item) && !wasRolledBack && (
          <Text size="sm" variant="muted">
            Rollback available until {formatDate(item.rollbackExpiresAt)}
          </Text>
        )}
      </div>
      {showRollback && canRollbackItem(item) && (
        <div className="shrink-0">
          <Button
            size="sm"
            variant="outline"
            disabled={isRollingBack}
            onClick={() => onRollback(item.id)}
          >
            {isRollingBack ? 'Rolling back...' : 'Rollback'}
          </Button>
        </div>
      )}
    </div>
  );
}

const INITIAL_VISIBLE = 5;

export function SyncHistorySection({
  frameworkInstanceId,
  permissions,
}: SyncHistorySectionProps) {
  const { data: history, isLoading } = useFrameworkSyncHistory(frameworkInstanceId);
  const { rollback, isRollingBack } = useFrameworkRollback(frameworkInstanceId);
  const [pendingRollback, setPendingRollback] = useState<SyncHistoryItem | null>(null);
  const [showAll, setShowAll] = useState(false);

  const canUpdate = hasPermission(permissions, 'framework', 'update');
  const items = Array.isArray(history) ? history : [];

  // Only the most recent non-reversed sync can be rolled back. Rolling back
  // an older sync in the middle of a chain would leave the instance in an
  // inconsistent state, so we surface the Rollback action only on that row.
  const latestRollbackableSyncId = items.find(
    (i) => i.kind === 'SYNC' && !i.rolledBackByOperationId,
  )?.id ?? null;

  if (isLoading) return null;
  if (items.length === 0) return null;

  const visibleItems = showAll ? items : items.slice(0, INITIAL_VISIBLE);
  const hiddenCount = items.length - visibleItems.length;

  const openRollbackDialog = (syncOperationId: string) => {
    const item = items.find((i) => i.id === syncOperationId);
    if (!item) return;
    setPendingRollback(item);
  };

  const handleConfirmRollback = async () => {
    if (!pendingRollback) return;
    try {
      await rollback(pendingRollback.id);
      toast.success(`Rolled back to v${pendingRollback.fromVersion.version}`);
      setPendingRollback(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to roll back framework',
      );
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {visibleItems.map((item) => (
          <HistoryItemRow
            key={item.id}
            item={item}
            showRollback={canUpdate && item.id === latestRollbackableSyncId}
            onRollback={openRollbackDialog}
            isRollingBack={isRollingBack && pendingRollback?.id === item.id}
          />
        ))}
      </div>
      {items.length > INITIAL_VISIBLE && (
        <div className="flex justify-center">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? 'Show less' : `Show ${hiddenCount} more`}
          </Button>
        </div>
      )}
      <RollbackConfirmDialog
        open={!!pendingRollback}
        onOpenChange={(open) => !open && setPendingRollback(null)}
        item={pendingRollback}
        isRollingBack={isRollingBack}
        onConfirm={handleConfirmRollback}
      />
    </div>
  );
}
