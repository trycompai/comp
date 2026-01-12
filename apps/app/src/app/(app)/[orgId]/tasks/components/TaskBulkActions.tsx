'use client';

import { useEffect, useState } from 'react';
import { Button } from '@comp/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@comp/ui';
import { ArrowUpDown, ChevronDown, Pencil, X } from 'lucide-react';
import { BulkTaskStatusChangeModal } from './BulkTaskStatusChangeModal';

interface TaskBulkActionsProps {
  selectedTaskIds: string[];
  onEdit: (isEditing: boolean) => void;
  onClearSelection: () => void;
}

export function TaskBulkActions({ selectedTaskIds, onEdit, onClearSelection }: TaskBulkActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [openBulk, setOpenBulk] = useState(false);

  useEffect(() => {
    onEdit(isEditing);
  }, [isEditing, onEdit]);

  return (
    <div className="ml-auto flex items-center gap-2">
      {isEditing ? (
        <>
          <span className="text-xs text-slate-500">{`${selectedTaskIds.length} item${selectedTaskIds.length > 1 ? 's' : ''} selected`}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost">
                <span className="text-slate-500">Actions</span>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setOpenBulk(true)} disabled={selectedTaskIds.length === 0}>
                <ArrowUpDown className="mr-2 h-4 w-4 text-slate-500" />
                Change Status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
            <X className="h-4 w-4 text-slate-400" />
          </Button>
        </>
      ) : (
        <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
          <Pencil className="h-4 w-4 text-slate-500" />
        </Button>
      )}
      <BulkTaskStatusChangeModal
        selectedTaskIds={selectedTaskIds}
        open={openBulk}
        onOpenChange={setOpenBulk}
        onSuccess={() => {
          onClearSelection();
          setIsEditing(false);
        }}
      />
    </div>
  );
}

