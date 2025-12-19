'use client';

import { Button } from '@comp/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Check, Link2, Tags, Trash2 } from 'lucide-react';
import { SelectAssignee } from '@/components/SelectAssignee';
import { toast } from 'sonner';
import type { TaskItem, TaskItemPriority, TaskItemStatus } from '@/hooks/use-task-items';
import type { Member, User } from '@db';

type OrganizationMember = Member & {
  user: User;
};
import {
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  getStatusIcon,
  getStatusColor,
  getPriorityIcon,
  getPriorityColor,
  getTaskIdShort,
} from './task-item-utils';

interface TaskItemFocusSidebarProps {
  taskItem: TaskItem;
  assignableMembers: OrganizationMember[];
  isUpdating: boolean;
  copiedLink: boolean;
  copiedTaskId: boolean;
  onCopyLink: () => void;
  onCopyTaskId: () => void;
  onDelete: () => void;
  onStatusChange: (status: TaskItemStatus) => Promise<void>;
  onPriorityChange: (priority: TaskItemPriority) => Promise<void>;
  onAssigneeChange: (assigneeId: string | null) => Promise<void>;
  onStatusOrPriorityChange?: () => void;
}

export function TaskItemFocusSidebar({
  taskItem,
  assignableMembers,
  isUpdating,
  copiedLink,
  copiedTaskId,
  onCopyLink,
  onCopyTaskId,
  onDelete,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onStatusOrPriorityChange,
}: TaskItemFocusSidebarProps) {
  const StatusIcon = getStatusIcon(taskItem.status);
  const PriorityIcon = getPriorityIcon(taskItem.priority);

  return (
    <div className="w-64 shrink-0 space-y-3 pl-6 relative">
      {/* Left border line - extends full height */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-border -my-6" />
      
      {/* Properties */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Properties
          </label>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
              onClick={onCopyLink}
              title="Copy task link"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
              onClick={onCopyTaskId}
              title="Copy task ID"
            >
              {copiedTaskId ? <Check className="h-3.5 w-3.5" /> : <Tags className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              onClick={onDelete}
              title="Delete task"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Status */}
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`w-full h-7 rounded-md cursor-pointer select-none transition-all duration-200 focus:outline-none hover:bg-accent/50 active:bg-accent flex items-center gap-2 group ${getStatusColor(taskItem.status)}`}
              aria-label={`Status: ${taskItem.status.replace('_', ' ')}`}
            >
              <StatusIcon className="h-3.5 w-3.5 stroke-[2] shrink-0" />
              <span className="text-xs font-medium capitalize flex-1 text-left">
                {taskItem.status.replace('_', ' ')}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {STATUS_OPTIONS.map((option) => {
              const isSelected = taskItem.status === option.value;
              const OptionIcon = getStatusIcon(option.value);
              return (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => onStatusChange(option.value)}
                  className={`cursor-pointer ${isSelected ? 'bg-accent font-medium' : ''}`}
                >
                  <div className="flex items-center gap-2.5 w-full">
                    <OptionIcon
                      className={`h-3.5 w-3.5 stroke-[2] shrink-0 ${getStatusColor(option.value)}`}
                    />
                    <span>{option.label}</span>
                    {isSelected && <span className="ml-auto text-xs">✓</span>}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Priority */}
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`w-full h-7 rounded-md cursor-pointer select-none transition-all duration-200 focus:outline-none hover:bg-accent/50 active:bg-accent flex items-center gap-2 group ${getPriorityColor(taskItem.priority)}`}
              aria-label={`Priority: ${taskItem.priority}`}
            >
              <PriorityIcon className="h-3.5 w-3.5 stroke-[2] shrink-0" />
              <span className="text-xs font-medium capitalize flex-1 text-left">
                {taskItem.priority}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {PRIORITY_OPTIONS.map((option) => {
              const isSelected = taskItem.priority === option.value;
              const OptionIcon = getPriorityIcon(option.value);
              return (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => onPriorityChange(option.value)}
                  className={`cursor-pointer ${isSelected ? 'bg-accent font-medium' : ''}`}
                >
                  <div className="flex items-center gap-2.5 w-full">
                    <OptionIcon
                      className={`h-3.5 w-3.5 stroke-[2] shrink-0 ${getPriorityColor(option.value)}`}
                    />
                    <span>{option.label}</span>
                    {isSelected && <span className="ml-auto text-xs">✓</span>}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Assignee */}
      {assignableMembers && assignableMembers.length > 0 && (
        <div>
          <div onClick={(e) => e.stopPropagation()}>
            <div className="[&_button]:border-0 [&_button]:shadow-none [&_button]:bg-transparent hover:[&_button]:bg-accent/50 [&_button]:h-7 [&_button]:rounded-md [&_button]:transition-all [&_button]:duration-200 [&_button]:w-full [&_button]:px-0 [&_button]:gap-2 [&_button>div]:flex [&_button>div]:items-center [&_button>div]:gap-1.5 [&_button>div]:w-[105px] [&_button_svg]:hidden [&_button>div>span]:text-xs [&_button_span]:h-4 [&_button_span]:w-4">
              <SelectAssignee
                assigneeId={taskItem.assignee?.id || null}
                assignees={assignableMembers}
                onAssigneeChange={async (newAssigneeId) => {
                  try {
                    await onAssigneeChange(newAssigneeId);
                    toast.success('Assignee updated');
                    onStatusOrPriorityChange?.();
                  } catch (error) {
                    toast.error('Failed to update assignee');
                  }
                }}
                withTitle={false}
                disabled={isUpdating}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

