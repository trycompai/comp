'use client';

import { Badge, Button, Heading, Stack, Text } from '@trycompai/design-system';
import { useState } from 'react';
import { toast } from 'sonner';
import { useFrameworkSyncHistory } from '@/hooks/use-framework-sync-history';
import { useFrameworkRollback } from '@/hooks/use-framework-rollback';
import { hasPermission } from '@/lib/permissions';
import type { UserPermissions } from '@/lib/permissions';
import type { SyncHistoryItem } from '@/types/framework-versioning';

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
          {formatDate(item.performedAt)}
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

export function SyncHistorySection({
  frameworkInstanceId,
  permissions,
}: SyncHistorySectionProps) {
  const { data: history, isLoading } = useFrameworkSyncHistory(frameworkInstanceId);
  const { rollback, isRollingBack } = useFrameworkRollback(frameworkInstanceId);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  const canUpdate = hasPermission(permissions, 'framework', 'update');
  const items = Array.isArray(history) ? history : [];

  if (isLoading) return null;
  if (items.length === 0) return null;

  const handleRollback = async (syncOperationId: string) => {
    const item = items.find((i) => i.id === syncOperationId);
    if (!item) return;
    setRollingBackId(syncOperationId);
    try {
      await rollback(syncOperationId);
      toast.success(
        `Rolled back to v${item.fromVersion.version}`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to roll back framework',
      );
    } finally {
      setRollingBackId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Heading level="3">Sync history</Heading>
      <Stack gap="2">
        {items.map((item) => (
          <HistoryItemRow
            key={item.id}
            item={item}
            showRollback={canUpdate}
            onRollback={handleRollback}
            isRollingBack={isRollingBack && rollingBackId === item.id}
          />
        ))}
      </Stack>
    </div>
  );
}
