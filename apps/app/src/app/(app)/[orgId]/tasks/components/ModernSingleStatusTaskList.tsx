'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@comp/ui/button';
import { Checkbox } from '@comp/ui/checkbox';
import { Member, Task, User } from '@db';
import { RefreshCw, Trash2, User as UserIcon } from 'lucide-react';
import { BulkTaskAssigneeChangeModal } from './BulkTaskAssigneeChangeModal';
import { BulkTaskDeleteModal } from './BulkTaskDeleteModal';
import { BulkTaskStatusChangeModal } from './BulkTaskStatusChangeModal';
import { ModernTaskListItem } from './ModernTaskListItem';
import { TaskBulkActions } from './TaskBulkActions';

interface ModernSingleStatusTaskListProps {
  config: {
    icon: any;
    label: string;
    color: string;
  };
  tasks: (Task & {
    controls?: { id: string; name: string }[];
    evidenceAutomations?: Array<{
      id: string;
      isEnabled: boolean;
      name: string;
      runs?: Array<{
        status: string;
        success: boolean | null;
        evaluationStatus: string | null;
        createdAt: Date;
        triggeredBy: string;
        runDuration: number | null;
      }>;
    }>;
  })[];
  members: (Member & { user: User })[];
  handleTaskClick: (taskId: string) => void;
  evidenceApprovalEnabled?: boolean;
}

export function ModernSingleStatusTaskList({
  config,
  tasks,
  members,
  handleTaskClick,
  evidenceApprovalEnabled = false,
}: ModernSingleStatusTaskListProps) {
  const [selectable, setSelectable] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [openBulkStatus, setOpenBulkStatus] = useState(false);
  const [openBulkAssignee, setOpenBulkAssignee] = useState(false);
  const [openBulkDelete, setOpenBulkDelete] = useState(false);
  const StatusIcon = config.icon;

  useEffect(() => {
    if (!selectable) {
      setSelectedTaskIds([]);
    }
  }, [selectable]);

  // Remove stale selections when the visible task list changes
  useEffect(() => {
    const visibleIds = new Set(tasks.map((task) => task.id));
    setSelectedTaskIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [tasks]);

  const visibleIds = useMemo(() => new Set(tasks.map((task) => task.id)), [tasks]);
  const visibleSelectedCount = selectedTaskIds.filter((id) => visibleIds.has(id)).length;
  const allSelected = tasks.length > 0 && visibleSelectedCount === tasks.length;
  const noneSelected = visibleSelectedCount === 0;
  const someSelected = !noneSelected && !allSelected;

  const selectAllChecked = useMemo(() => {
    if (allSelected) return true;
    if (someSelected) return 'indeterminate';
    return false;
  }, [allSelected, someSelected]);

  const handleSelectAllChange = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedTaskIds(tasks.map((task) => task.id));
      return;
    }
    setSelectedTaskIds([]);
  };

  const handleSelect = (taskId: string, checked: boolean) => {
    setSelectedTaskIds((prev) =>
      checked ? Array.from(new Set([...prev, taskId])) : prev.filter((id) => id !== taskId),
    );
  };

  const handleBulkActionSuccess = () => {
    setSelectedTaskIds([]);
    setSelectable(false);
  };

  const buttonClassName =
    'h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent';
  const deleteButtonClassName =
    'h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 border-b border-border/50 pb-2">
        <StatusIcon className={`h-4 w-4 ${config.color}`} />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {config.label}
        </h3>
        <span className="text-muted-foreground/60 text-xs font-medium">({tasks.length})</span>
        <TaskBulkActions
          selectedTaskIds={selectedTaskIds}
          isEditing={selectable}
          onEdit={setSelectable}
          onClearSelection={handleBulkActionSuccess}
        />
      </div>
      <div className="divide-y divide-border/50 overflow-hidden rounded-lg border border-border/60 bg-card">
        {selectable ? (
          <div className="flex items-center gap-4 p-4">
            <Checkbox
              checked={selectAllChecked}
              onCheckedChange={handleSelectAllChange}
              aria-label="Select all tasks"
            />
            <span className="text-sm text-muted-foreground">Select all</span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenBulkStatus(true)}
                disabled={selectedTaskIds.length === 0}
                className={buttonClassName}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Status</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenBulkAssignee(true)}
                disabled={selectedTaskIds.length === 0}
                className={buttonClassName}
              >
                <UserIcon className="h-3.5 w-3.5" />
                <span>Assignee</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenBulkDelete(true)}
                disabled={selectedTaskIds.length === 0}
                className={deleteButtonClassName}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </Button>
            </div>
            <BulkTaskStatusChangeModal
              selectedTaskIds={selectedTaskIds}
              open={openBulkStatus}
              onOpenChange={setOpenBulkStatus}
              onSuccess={handleBulkActionSuccess}
              evidenceApprovalEnabled={evidenceApprovalEnabled}
              members={members}
            />
            <BulkTaskAssigneeChangeModal
              selectedTaskIds={selectedTaskIds}
              members={members}
              open={openBulkAssignee}
              onOpenChange={setOpenBulkAssignee}
              onSuccess={handleBulkActionSuccess}
            />
            <BulkTaskDeleteModal
              selectedTaskIds={selectedTaskIds}
              open={openBulkDelete}
              onOpenChange={setOpenBulkDelete}
              onSuccess={handleBulkActionSuccess}
            />
          </div>
        ) : null}
        {tasks.map((task) => (
          <ModernTaskListItem
            key={task.id}
            task={task}
            members={members}
            onClick={handleTaskClick}
            selectable={selectable}
            selected={selectedTaskIds.includes(task.id)}
            onSelectChange={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}
