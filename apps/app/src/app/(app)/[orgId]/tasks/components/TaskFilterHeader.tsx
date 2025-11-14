'use client';

import { Button } from '@comp/ui/button';
import { Check, Circle, List, Loader2, Plus, X, XCircle } from 'lucide-react';
import { useQueryState } from 'nuqs';
import React from 'react';

// Configuration for task statuses and their display order.
const statuses = [
  { id: 'in_progress', title: 'In Progress' },
  { id: 'todo', title: 'Todo' },
  { id: 'done', title: 'Done' },
  { id: 'failed', title: 'Failed' },
  { id: 'not_relevant', title: 'Not Relevant' },
] as const;
type StatusId = (typeof statuses)[number]['id'];

/**
 * Renders the header section for filtering tasks by status.
 * Uses `nuqs` to manage filter state in the URL search parameters.
 */
export function TaskFilterHeader() {
  // State for the status filter, synced with the 'status' URL query parameter.
  const [statusFilter, setStatusFilter] = useQueryState('status', {
    shallow: false, // Ensures full page reload on change to refetch server data.
  });

  // State for the create task sheet
  const [createTaskOpen, setCreateTaskOpen] = useQueryState('create-task');

  // Mapping of status IDs (and 'all') to their corresponding icons.
  const statusIcons: Record<StatusId | 'all', React.ElementType> = {
    all: List,
    in_progress: Loader2,
    todo: Circle,
    done: Check,
    failed: XCircle,
    not_relevant: X,
  };

  // Helper function to determine button styling based on active state.
  const getButtonClasses = (isActive: boolean) => {
    const baseClasses = 'flex items-center space-x-1.5';
    const inactiveClasses = 'text-muted-foreground hover:bg-accent hover:text-accent-foreground';
    return `${baseClasses} ${isActive ? '' : inactiveClasses}`.trim();
  };

  // Check if any status filters are currently active.
  const filtersActive = statusFilter !== null;

  // Handler to clear all active filters.
  const clearFilters = () => {
    setStatusFilter(null);
  };

  return (
    <div className="flex items-center justify-between">
      {/* Status Filter Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant={statusFilter === null ? 'secondary' : 'ghost'}
          size="sm"
          className={getButtonClasses(statusFilter === null)}
          onClick={() => setStatusFilter(null)}
        >
          <List className="h-3.5 w-3.5" />
          <span>All</span>
        </Button>
        {statuses.map((status) => {
          const Icon = statusIcons[status.id];
          const isActive = statusFilter === status.id;
          return (
            <Button
              key={status.id}
              variant={isActive ? 'secondary' : 'ghost'}
              size="sm"
              className={getButtonClasses(isActive)}
              onClick={() => setStatusFilter(status.id)}
            >
              {React.createElement(Icon, { className: 'h-3.5 w-3.5' })}
              <span>{status.title}</span>
            </Button>
          );
        })}
        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Create Task Button */}
      <Button
        variant="default"
        size="sm"
        onClick={() => setCreateTaskOpen('true')}
        className="flex items-center gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Create Task</span>
      </Button>
    </div>
  );
}
