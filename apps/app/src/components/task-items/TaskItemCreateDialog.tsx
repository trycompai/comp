'use client';

import type { TaskItemEntityType, TaskItemFilters, TaskItemSortBy, TaskItemSortOrder } from '@/hooks/use-task-items';
import { usePermissions } from '@/hooks/use-permissions';
import { useMediaQuery } from '@comp/ui/hooks';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@trycompai/design-system';
import { TaskItemForm } from './TaskItemForm';

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
  const isDesktop = useMediaQuery('(min-width: 768px)');

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

  const formContent = (
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
  );

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create task</SheetTitle>
          </SheetHeader>
          <SheetBody>{formContent}</SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Create task</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">{formContent}</div>
      </DrawerContent>
    </Drawer>
  );
}
