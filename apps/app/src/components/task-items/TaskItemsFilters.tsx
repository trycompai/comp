'use client';

import type { TaskItemFilters, TaskItemSortBy, TaskItemSortOrder } from '@/hooks/use-task-items';
import type { Member, User } from '@db';
import {
  Button,
  HStack,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
} from '@trycompai/design-system';
import { ArrowsVertical, Filter, Flag, UserMultiple } from '@trycompai/design-system/icons';

type OrganizationMember = Member & {
  user: User;
};

interface TaskItemsFiltersProps {
  sortBy: TaskItemSortBy;
  sortOrder: TaskItemSortOrder;
  filters: TaskItemFilters;
  assignableMembers: OrganizationMember[];
  hasTasks: boolean;
  statsLoading: boolean;
  onSortChange: (value: string) => void;
  onFilterChange: (filterType: 'status' | 'priority' | 'assigneeId', value: string | null) => void;
  onClearFilters: () => void;
}

export function TaskItemsFilters({
  sortBy,
  sortOrder,
  filters,
  assignableMembers,
  hasTasks,
  statsLoading,
  onSortChange,
  onFilterChange,
  onClearFilters,
}: TaskItemsFiltersProps) {
  const hasActiveFilters = filters.status || filters.priority || filters.assigneeId;
  const sortValue = `${sortBy}-${sortOrder}`;
  const sortLabelMap: Record<string, string> = {
    'createdAt-desc': 'Newest First',
    'createdAt-asc': 'Oldest First',
    'updatedAt-desc': 'Recently Updated',
    'updatedAt-asc': 'Least Updated',
    'priority-desc': 'Priority Low-High',
    'priority-asc': 'Priority High-Low',
  };
  const sortLabel = sortLabelMap[sortValue] ?? 'Sort';
  const statusLabels: Record<string, string> = {
    todo: 'Todo',
    in_progress: 'In Progress',
    in_review: 'In Review',
    done: 'Done',
    canceled: 'Canceled',
  };
  const priorityLabels: Record<string, string> = {
    urgent: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  const statusLabel = filters.status ? (statusLabels[filters.status] ?? 'Status') : 'All Status';
  const priorityLabel = filters.priority
    ? (priorityLabels[filters.priority] ?? 'Priority')
    : 'All Priority';
  const assigneeLabel = (() => {
    if (!filters.assigneeId) return 'All Assignees';
    if (filters.assigneeId === '__unassigned__') return 'Unassigned';
    const selected = assignableMembers.find((member) => member.id === filters.assigneeId);
    return selected?.user.name || selected?.user.email || 'Assignee';
  })();

  return (
    <HStack gap="xs" align="center" wrap="wrap">
      <div style={{ minWidth: 180 }}>
        <Select
          value={`${sortBy}-${sortOrder}`}
          onValueChange={(value) => onSortChange(value ?? 'createdAt-desc')}
          disabled={!hasTasks || statsLoading}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Sort">
              <HStack gap="xs" align="center">
                <ArrowsVertical className="h-4 w-4" />
                <Text size="sm">{sortLabel}</Text>
              </HStack>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt-desc">Newest First</SelectItem>
            <SelectItem value="createdAt-asc">Oldest First</SelectItem>
            <SelectItem value="updatedAt-desc">Recently Updated</SelectItem>
            <SelectItem value="updatedAt-asc">Least Updated</SelectItem>
            <SelectItem value="priority-desc">Priority Low-High</SelectItem>
            <SelectItem value="priority-asc">Priority High-Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div style={{ minWidth: 160 }}>
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) =>
            onFilterChange('status', value && value !== 'all' ? value : null)
          }
          disabled={!hasTasks || statsLoading}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Status">
              <HStack gap="xs" align="center">
                <Filter className="h-4 w-4" />
                <Text size="sm">{statusLabel}</Text>
              </HStack>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div style={{ minWidth: 160 }}>
        <Select
          value={filters.priority || 'all'}
          onValueChange={(value) =>
            onFilterChange('priority', value && value !== 'all' ? value : null)
          }
          disabled={!hasTasks || statsLoading}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Priority">
              <HStack gap="xs" align="center">
                <Flag className="h-4 w-4" />
                <Text size="sm">{priorityLabel}</Text>
              </HStack>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <HStack gap="xs" align="center">
                <Flag className="h-4 w-4" />
                <span>All Priority</span>
              </HStack>
            </SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {assignableMembers && assignableMembers.length > 0 && (
        <div style={{ minWidth: 180 }}>
          <Select
            value={
              filters.assigneeId === '__unassigned__' ? 'unassigned' : filters.assigneeId || 'all'
            }
            onValueChange={(value) =>
              onFilterChange('assigneeId', value && value !== 'all' ? value : null)
            }
            disabled={!hasTasks || statsLoading}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="Assignee">
                <HStack gap="xs" align="center">
                  <UserMultiple className="h-4 w-4" />
                  <Text size="sm">{assigneeLabel}</Text>
                </HStack>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <HStack gap="xs" align="center">
                  <UserMultiple className="h-4 w-4" />
                  <span>All Assignees</span>
                </HStack>
              </SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {assignableMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.user.name || member.user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          disabled={!hasTasks || statsLoading}
        >
          Clear Filters
        </Button>
      )}
    </HStack>
  );
}
