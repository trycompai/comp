'use client';

import { SelectAssignee } from '@/components/SelectAssignee';
import type { TaskItem, TaskItemPriority, TaskItemStatus } from '@/hooks/use-task-items';
import type { Member, User } from '@db';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HStack,
  Stack,
  Text,
} from '@trycompai/design-system';
import {
  ArrowLeft,
  Checkmark,
  Link,
  Tag,
  TrashCan,
  User as UserIcon,
} from '@trycompai/design-system/icons';
import { toast } from 'sonner';
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  getPriorityColor,
  getPriorityIcon,
  getStatusColor,
  getStatusIcon,
} from './task-item-utils';

type OrganizationMember = Member & {
  user: User;
};

interface TaskItemFocusSidebarProps {
  taskItem: TaskItem;
  assignableMembers: OrganizationMember[];
  isUpdating: boolean;
  copiedLink: boolean;
  copiedTaskId: boolean;
  isCollapsed: boolean;
  onCopyLink: () => void;
  onCopyTaskId: () => void;
  onDelete: () => void;
  onCollapse: () => void;
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
  isCollapsed,
  onCopyLink,
  onCopyTaskId,
  onDelete,
  onCollapse,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onStatusOrPriorityChange,
}: TaskItemFocusSidebarProps) {
  const StatusIcon = getStatusIcon(taskItem.status);
  const PriorityIcon = getPriorityIcon(taskItem.priority);

  if (isCollapsed) {
    return (
      <div className="w-12 shrink-0 relative flex flex-col items-center -mr-6 transition-all duration-300 ease-in-out overflow-hidden">
        {/* Left border line */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-border -my-6" />

        {/* All controls in one centered column */}
        <div className="flex flex-col items-center gap-2 py-2 w-full">
          {/* Collapse button */}
          <div className="mb-2">
            <Button variant="ghost" size="icon" onClick={onCollapse} title="Expand sidebar">
              <ArrowLeft className="h-3.5 w-3.5 shrink-0 transition-transform duration-400 ease-in-out" />
            </Button>
          </div>

          {/* Status */}
          <DropdownMenu>
            <DropdownMenuTrigger variant="menubar">
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted/50 hover:bg-muted ${getStatusColor(taskItem.status)}`}
                title={`Status: ${taskItem.status.replace('_', ' ')}`}
              >
                <StatusIcon className="h-3.5 w-3.5 stroke-2" />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="left">
              <div className="w-44">
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = taskItem.status === option.value;
                  const OptionIcon = getStatusIcon(option.value);
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onSelect={() => onStatusChange(option.value)}
                    >
                      <HStack gap="sm" align="center" style={{ width: '100%' }}>
                        <OptionIcon
                          className={`h-3.5 w-3.5 stroke-2 shrink-0 ${getStatusColor(option.value)}`}
                        />
                        <Text size="sm">{option.label}</Text>
                        {isSelected && (
                          <Text as="span" size="xs" variant="muted" style={{ marginLeft: 'auto' }}>
                            ✓
                          </Text>
                        )}
                      </HStack>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Priority */}
          <DropdownMenu>
            <DropdownMenuTrigger variant="menubar">
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted/50 hover:bg-muted ${getPriorityColor(taskItem.priority)}`}
                title={`Priority: ${taskItem.priority}`}
              >
                <PriorityIcon className="h-3.5 w-3.5 stroke-2" />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="left">
              <div className="w-44">
                {PRIORITY_OPTIONS.map((option) => {
                  const isSelected = taskItem.priority === option.value;
                  const OptionIcon = getPriorityIcon(option.value);
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onSelect={() => onPriorityChange(option.value)}
                    >
                      <HStack gap="sm" align="center" style={{ width: '100%' }}>
                        <OptionIcon
                          className={`h-3.5 w-3.5 stroke-2 shrink-0 ${getPriorityColor(option.value)}`}
                        />
                        <Text size="sm">{option.label}</Text>
                        {isSelected && (
                          <Text as="span" size="xs" variant="muted" style={{ marginLeft: 'auto' }}>
                            ✓
                          </Text>
                        )}
                      </HStack>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assignee */}
          {assignableMembers && assignableMembers.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger variant="menubar">
                <span
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted/50 hover:bg-muted"
                  title={
                    taskItem.assignee
                      ? `Assignee: ${taskItem.assignee.user?.name || taskItem.assignee.user?.email}`
                      : 'No assignee'
                  }
                >
                  {taskItem.assignee?.user?.image ? (
                    <img
                      src={taskItem.assignee.user.image}
                      alt={
                        taskItem.assignee.user.name || taskItem.assignee.user.email || 'Assignee'
                      }
                      className="h-5 w-5 rounded-full"
                    />
                  ) : (
                    <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="left">
                <div className="w-44">
                  <DropdownMenuItem onSelect={() => onAssigneeChange(null)}>
                    <HStack gap="sm" align="center" style={{ width: '100%' }}>
                      <UserIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <Text size="sm">Unassigned</Text>
                      {!taskItem.assignee && (
                        <Text as="span" size="xs" variant="muted" style={{ marginLeft: 'auto' }}>
                          ✓
                        </Text>
                      )}
                    </HStack>
                  </DropdownMenuItem>
                  {assignableMembers.map((member) => {
                    const isSelected = taskItem.assignee?.id === member.id;
                    return (
                      <DropdownMenuItem
                        key={member.id}
                        onSelect={() => onAssigneeChange(member.id)}
                      >
                        <HStack gap="sm" align="center" style={{ width: '100%' }}>
                          {member.user.image ? (
                            <img
                              src={member.user.image}
                              alt={member.user.name || member.user.email || 'User'}
                              className="h-4 w-4 rounded-full shrink-0"
                            />
                          ) : (
                            <UserIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">{member.user.name || member.user.email}</span>
                          {isSelected && (
                            <Text
                              as="span"
                              size="xs"
                              variant="muted"
                              style={{ marginLeft: 'auto' }}
                            >
                              ✓
                            </Text>
                          )}
                        </HStack>
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />
      </div>
    );
  }

  return (
    <div className="w-64 shrink-0 space-y-3 pl-6 relative flex flex-col transition-all duration-300 ease-in-out overflow-hidden">
      {/* Left border line - extends full height */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-border -my-6" />

      {/* Properties */}
      <Stack gap="sm">
        <div className="flex items-center justify-between pb-3 border-b border-border min-w-0">
          <HStack gap="sm" align="center">
            <Button variant="ghost" size="icon" onClick={onCollapse} title="Collapse sidebar">
              <ArrowLeft className="h-3.5 w-3.5 shrink-0 transition-transform duration-400 ease-in-out rotate-180" />
            </Button>
            <Text size="xs" variant="muted" weight="semibold">
              Properties
            </Text>
          </HStack>
          <HStack gap="xs" align="center">
            <Button variant="ghost" size="icon" onClick={onCopyLink} title="Copy task link">
              {copiedLink ? (
                <Checkmark className="h-3.5 w-3.5" />
              ) : (
                <Link className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onCopyTaskId} title="Copy task ID">
              {copiedTaskId ? (
                <Checkmark className="h-3.5 w-3.5" />
              ) : (
                <Tag className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button variant="destructive" size="icon" onClick={onDelete} title="Delete task">
              <TrashCan className="h-3.5 w-3.5" />
            </Button>
          </HStack>
        </div>
      </Stack>

      {/* Status */}
      <HStack gap="sm" align="center">
        <div style={{ width: 80 }}>
          <Text as="span" size="xs" variant="muted" weight="medium">
            Status
          </Text>
        </div>
        <div className="flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger variant="menubar">
              <span
                className={`flex w-full items-center gap-2 ${getStatusColor(taskItem.status)}`}
                aria-label={`Status: ${taskItem.status.replace('_', ' ')}`}
              >
                <StatusIcon className="h-3.5 w-3.5 stroke-2 shrink-0" />
                <Text as="span" size="xs" weight="medium">
                  {taskItem.status.replace('_', ' ')}
                </Text>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="w-44">
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = taskItem.status === option.value;
                  const OptionIcon = getStatusIcon(option.value);
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onSelect={() => onStatusChange(option.value)}
                    >
                      <HStack gap="sm" align="center" style={{ width: '100%' }}>
                        <OptionIcon
                          className={`h-3.5 w-3.5 stroke-2 shrink-0 ${getStatusColor(option.value)}`}
                        />
                        <Text size="sm">{option.label}</Text>
                        {isSelected && (
                          <Text as="span" size="xs" variant="muted" style={{ marginLeft: 'auto' }}>
                            ✓
                          </Text>
                        )}
                      </HStack>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </HStack>

      {/* Priority */}
      <HStack gap="sm" align="center">
        <div style={{ width: 80 }}>
          <Text as="span" size="xs" variant="muted" weight="medium">
            Priority
          </Text>
        </div>
        <div className="flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger variant="menubar">
              <span
                className={`flex w-full items-center gap-2 ${getPriorityColor(taskItem.priority)}`}
                aria-label={`Priority: ${taskItem.priority}`}
              >
                <PriorityIcon className="h-3.5 w-3.5 stroke-2 shrink-0" />
                <Text as="span" size="xs" weight="medium">
                  {taskItem.priority}
                </Text>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="w-44">
                {PRIORITY_OPTIONS.map((option) => {
                  const isSelected = taskItem.priority === option.value;
                  const OptionIcon = getPriorityIcon(option.value);
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onSelect={() => onPriorityChange(option.value)}
                    >
                      <HStack gap="sm" align="center" style={{ width: '100%' }}>
                        <OptionIcon
                          className={`h-3.5 w-3.5 stroke-2 shrink-0 ${getPriorityColor(option.value)}`}
                        />
                        <Text size="sm">{option.label}</Text>
                        {isSelected && (
                          <Text as="span" size="xs" variant="muted" style={{ marginLeft: 'auto' }}>
                            ✓
                          </Text>
                        )}
                      </HStack>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </HStack>

      {/* Assignee */}
      {assignableMembers && assignableMembers.length > 0 && (
        <HStack gap="sm" align="center">
          <div style={{ width: 80 }}>
            <Text as="span" size="xs" variant="muted" weight="medium">
              Assignee
            </Text>
          </div>
          <div className="flex-1">
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
        </HStack>
      )}
    </div>
  );
}
