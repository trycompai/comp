'use client';

import { Button } from '@comp/ui/button';
import { Pencil, X } from 'lucide-react';

interface TaskBulkActionsProps {
  selectedTaskIds: string[];
  isEditing: boolean;
  onEdit: (isEditing: boolean) => void;
  onClearSelection: () => void;
}

export function TaskBulkActions({
  selectedTaskIds,
  isEditing,
  onEdit,
  onClearSelection,
}: TaskBulkActionsProps) {
  const handleToggleEdit = () => {
    onEdit(!isEditing);
  };

  const handleClose = () => {
    onEdit(false);
    onClearSelection();
  };

  return (
    <div className="ml-auto flex items-center gap-2">
      {isEditing ? (
        <>
          <span className="text-xs text-slate-500">
            {`${selectedTaskIds.length} item${selectedTaskIds.length > 1 ? 's' : ''} selected`}
          </span>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4 text-slate-400" />
          </Button>
        </>
      ) : (
        <Button variant="ghost" size="icon" onClick={handleToggleEdit}>
          <Pencil className="h-4 w-4 text-slate-500" />
        </Button>
      )}
    </div>
  );
}

