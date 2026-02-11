'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@comp/ui/dialog';
import type { TaskItemEntityType, TaskItemFilters, TaskItemSortBy, TaskItemSortOrder } from '@/hooks/use-task-items';
import { TaskItemForm } from './TaskItemForm';
import { usePermissions } from '@/hooks/use-permissions';

interface TaskItemCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  entityType: TaskItemEntityType;
  page: number;
  limit: number;
  sortBy: TaskItemSortBy;
  sortOrder: TaskItemSortOrder;
  filters: TaskItemFilters;
  onSuccess: () => void;
}

export function TaskItemCreateDialog({
  open,
  onOpenChange,
  entityId,
  entityType,
  page,
  limit,
  sortBy,
  sortOrder,
  filters,
  onSuccess,
}: TaskItemCreateDialogProps) {
  const { hasPermission } = usePermissions();

  if (!hasPermission('task', 'create')) {
    return null;
  }

  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>Add a new task for this record.</DialogDescription>
        </DialogHeader>
        <TaskItemForm
          entityId={entityId}
          entityType={entityType}
          page={page}
          limit={limit}
          sortBy={sortBy}
          sortOrder={sortOrder}
          filters={filters}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}

