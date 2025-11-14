'use client';

import type { Member, Task, User } from '@db';
import { useAction } from 'next-safe-action/hooks';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { useCallback, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// updateTaskOrder is called directly within the StatusGroup component now.

import { updateTaskAction } from '@/actions/risk/task/update-task-action';
import { CreateTaskSheet } from './CreateTaskSheet';
import { StatusGroup } from './StatusGroup';
import type { DragItem, StatusId } from './TaskCard';
import { TaskFilterHeader } from './TaskFilterHeader';

// Defines the standard task statuses and their display order.
const statuses = [
  { id: 'in_progress', title: 'In Progress' },
  { id: 'todo', title: 'Todo' },
  { id: 'done', title: 'Done' },
  { id: 'failed', title: 'Failed' },
  { id: 'not_relevant', title: 'Not Relevant' },
] as const;

// Parser for validating StatusId from URL query parameters.
const statusIdParser = parseAsStringLiteral<StatusId>(['in_progress', 'todo', 'done', 'failed', 'not_relevant']);

/**
 * Renders the main task list view, including filtering and drag-and-drop capabilities.
 * Fetches initial task data via props (server-rendered).
 * Groups tasks by status and passes them to StatusGroup components.
 */
export function TaskList({
  tasks: initialTasks,
  members,
  controls,
}: {
  tasks: Task[];
  members: (Member & { user: User })[];
  controls: { id: string; name: string }[];
}) {
  // Hook to execute the server action for updating a task's status.
  const { execute: updateTaskExecute, status: updateTaskStatus } = useAction(updateTaskAction, {});

  // State for the status filter, synced with the URL query parameter.
  const [statusFilter, setStatusFilter] = useQueryState(
    'status',
    statusIdParser.withOptions({ shallow: false }),
  );

  // Memoized grouping of tasks by their status.
  const tasksByStatus = useMemo(() => {
    const grouped: Record<StatusId, Task[]> = {
      in_progress: [],
      todo: [],
      done: [],
      failed: [],
      not_relevant: [],
    };
    // Group tasks by status first
    for (const task of initialTasks) {
      if (grouped[task.status as StatusId]) {
        grouped[task.status as StatusId].push(task);
      }
    }
    // Sort each group alphabetically by title (A-Z)
    for (const status in grouped) {
      grouped[status as StatusId].sort((a, b) => 
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
      );
    }
    return grouped;
  }, [initialTasks]);

  // Modify handleDropTaskInternal to accept hoverIndex
  const handleDropTaskInternal = useCallback(
    (item: DragItem, targetStatus: StatusId, hoverIndex: number) => {
      console.log('DEBUG: handleDropTaskInternal called with:', {
        item,
        targetStatus,
        hoverIndex,
      });
      if (item.status !== targetStatus && updateTaskStatus !== 'executing') {
        // Update task status (tasks will be sorted alphabetically on next render)
        updateTaskExecute({
          id: item.id,
          status: targetStatus,
        });
      }
    },
    [updateTaskExecute, updateTaskStatus, tasksByStatus],
  );

  return (
    <div className="flex flex-col gap-2">
      <TaskFilterHeader />
      {/* Provides the drag-and-drop context for the task list. */}
      <DndProvider backend={HTML5Backend}>
        <div className="w-full rounded-sm border">
          {/* Render a StatusGroup for each defined status. */}
          {statuses.map((status) => (
            <StatusGroup
              key={status.id}
              status={status}
              tasks={tasksByStatus[status.id] || []} // Pass the correctly grouped and sorted tasks.
              handleDropTaskInternal={handleDropTaskInternal} // Pass the modified handler
              members={members}
              statusFilter={statusFilter}
            />
          ))}
        </div>
      </DndProvider>

      {/* Create Task Sheet */}
      <CreateTaskSheet members={members} controls={controls} />
    </div>
  );
}
