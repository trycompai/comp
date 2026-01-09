'use client';

import { useEffect, useState } from 'react';
import { Button } from '@comp/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@comp/ui';
import { ChevronDown, Pencil, RefreshCw, X } from 'lucide-react';

interface TaskBulkActionsProps {
  onEdit: (isEditing: boolean) => void;
}

export function TaskBulkActions({ onEdit }: TaskBulkActionsProps) {
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    onEdit(isEditing);
  }, [isEditing, onEdit]);

  return (
    <div className="ml-auto flex items-center gap-2">
      {isEditing ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost">
                <span className="text-slate-500">Actions</span>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <RefreshCw className="mr-2 h-4 w-4 text-slate-500" />
                Update Status
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
    </div>
  );
}

