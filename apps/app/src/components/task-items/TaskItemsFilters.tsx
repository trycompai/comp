'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Button } from '@comp/ui/button';
import { ArrowUpDown, Filter, Flag, Users } from 'lucide-react';
import type { TaskItemSortBy, TaskItemSortOrder, TaskItemFilters } from '@/hooks/use-task-items';
import type { Member, User } from '@db';

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

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select
        value={`${sortBy}-${sortOrder}`}
        onValueChange={onSortChange}
        disabled={!hasTasks || statsLoading}
      >
        <SelectTrigger className="h-9 w-[190px]">
          <ArrowUpDown className="mr-2 h-4 w-4" />
          <SelectValue />
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

      <Select
        value={filters.status || 'all'}
        onValueChange={(value) => onFilterChange('status', value === 'all' ? null : value)}
        disabled={!hasTasks || statsLoading}
      >
        <SelectTrigger className="h-9 w-[150px]">
          <Filter className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Status" />
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

      <Select
        value={filters.priority || 'all'}
        onValueChange={(value) => onFilterChange('priority', value === 'all' ? null : value)}
        disabled={!hasTasks || statsLoading}
      >
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4" />
              <span>All Priority</span>
            </div>
          </SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      {assignableMembers && assignableMembers.length > 0 && (
        <Select
          value={filters.assigneeId === '__unassigned__' ? 'unassigned' : filters.assigneeId || 'all'}
          onValueChange={(value) => onFilterChange('assigneeId', value === 'all' ? null : value)}
          disabled={!hasTasks || statsLoading}
        >
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>All Assignees</span>
              </div>
            </SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {assignableMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.user.name || member.user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-9"
          disabled={!hasTasks || statsLoading}
        >
          Clear Filters
        </Button>
      )}
    </div>
  );
}

