'use client';

import { useEffect, useMemo, useState } from 'react';

import { Member, Task, User } from '@db';
import { Checkbox } from '@comp/ui/checkbox';
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
}

export function ModernSingleStatusTaskList({ config, tasks, members, handleTaskClick }: ModernSingleStatusTaskListProps) {
  const [selectable, setSelectable] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const StatusIcon = config.icon;

  useEffect(() => {
    if (!selectable) {
      setSelectedTaskIds([]);
    }
  }, [selectable]);

  const allSelected = selectedTaskIds.length === tasks.length && tasks.length > 0;
  const noneSelected = selectedTaskIds.length === 0;
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
    setSelectedTaskIds((prev) => {
      if (checked) return Array.from(new Set([...prev, taskId]));
      return prev.filter((id) => id !== taskId);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2">
        <StatusIcon className={`h-4 w-4 ${config.color}`} />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          {config.label}
        </h3>
        <span className="text-slate-400 text-xs font-medium">({tasks.length})</span>
        <TaskBulkActions onEdit={setSelectable} />
      </div>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200/60 bg-white">
        {selectable ? (
          <div className="flex items-center gap-4 p-4">
            <Checkbox
              checked={selectAllChecked}
              onCheckedChange={handleSelectAllChange}
              aria-label="Select all tasks"
            />
            <span className="text-sm text-slate-600">Select all</span>
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
