'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Text,
} from '@trycompai/design-system';
import type { SyncHistoryItem } from '@/types/framework-versioning';

interface RollbackConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SyncHistoryItem | null;
  isRollingBack: boolean;
  onConfirm: () => void;
}

export function RollbackConfirmDialog({
  open,
  onOpenChange,
  item,
  isRollingBack,
  onConfirm,
}: RollbackConfirmDialogProps) {
  if (!item) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Roll back to v{item.fromVersion.version}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will revert the sync from v{item.fromVersion.version} to
            v{item.toVersion.version}. Items added by that sync will be
            removed, archived items will be restored, and any content edits
            you made since the sync will be kept.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Text size="sm" variant="muted">
          Rollback will be blocked if any task created by the sync has been
          completed, or if any policy created by the sync has been published.
        </Text>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRollingBack}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isRollingBack}>
            {isRollingBack ? 'Rolling back...' : 'Confirm rollback'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
