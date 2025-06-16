"use client";

import type { Member, Task, User } from "@comp/db/types";
import { useAction } from "next-safe-action/hooks";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useCallback, useMemo } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { updateTask } from "../actions/updateTask";
// updateTaskOrder is called directly within the StatusGroup component now.

import { StatusGroup } from "./StatusGroup";
import type { DragItem, StatusId } from "./TaskCard";
import { TaskFilterHeader } from "./TaskFilterHeader";
import { updateTaskAction } from "@/actions/risk/task/update-task-action";
import { Card } from "@comp/ui/card";

// Defines the standard task statuses and their display order.
const statuses = [
  { id: "in_progress", title: "In Progress" },
  { id: "todo", title: "Todo" },
  { id: "done", title: "Done" },
] as const;

// Parser for validating StatusId from URL query parameters.
const statusIdParser = parseAsStringLiteral<StatusId>([
  "in_progress",
  "todo",
  "done",
]);

/**
 * Renders the main task list view, including filtering and drag-and-drop capabilities.
 * Fetches initial task data via props (server-rendered).
 * Groups tasks by status and passes them to StatusGroup components.
 */
export function TaskList({
  tasks: initialTasks,
  members,
}: {
  tasks: Task[];
  members: (Member & { user: User })[];
}) {
  // Hook to execute the server action for updating a task's status.
  const { execute: updateTaskExecute, status: updateTaskStatus } = useAction(
    updateTaskAction,
    {},
  );

  // State for the status filter, synced with the URL query parameter.
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    statusIdParser.withOptions({ shallow: false }),
  );

  // Memoized grouping of tasks by their status.
  const tasksByStatus = useMemo(() => {
    const grouped: Record<StatusId, Task[]> = {
      in_progress: [],
      todo: [],
      done: [],
    };
    // Sort tasks by the server-provided order before grouping.
    const sortedTasks = [...initialTasks].sort((a, b) => a.order - b.order);
    for (const task of sortedTasks) {
      // Group tasks into the appropriate status array.
      if (grouped[task.status as StatusId]) {
        grouped[task.status as StatusId].push(task);
      }
    }
    return grouped;
  }, [initialTasks]);

  // Modify handleDropTaskInternal to accept hoverIndex
  const handleDropTaskInternal = useCallback(
    (item: DragItem, targetStatus: StatusId, hoverIndex: number) => {
      console.log("DEBUG: handleDropTaskInternal called with:", {
        item,
        targetStatus,
        hoverIndex,
      });
      if (item.status !== targetStatus && updateTaskStatus !== "executing") {
        // Find the target group tasks and calculate new order
        const targetGroup = tasksByStatus[targetStatus] || [];
        // Find the order of the task we are hovering over (if any)
        // Note: This assumes tasks are already sorted by order in tasksByStatus
        const hoverTaskOrder =
          hoverIndex < targetGroup.length
            ? targetGroup[hoverIndex].order
            : null;

        let newOrder: number;
        if (hoverTaskOrder !== null) {
          // Simple approach: take the order of the hovered item
          // More complex: calculate midpoint between hoverItem and item before/after
          newOrder = hoverTaskOrder;
        } else {
          // Dropped at the end, find max order + 1
          newOrder =
            targetGroup.length > 0
              ? Math.max(...targetGroup.map((t) => t.order)) + 1
              : 0;
        }

        // TODO: Update the server action (updateTask) to accept and set the 'order'
        // For now, just updating status
        updateTaskExecute({
          id: item.id,
          status: targetStatus /*, order: newOrder */,
        });

        // Optional: Re-index orders in the source and target groups if needed
        // (Requires another server action or more complex update logic)
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
    </div>
  );
}
