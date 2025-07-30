'use client';

import type { Member, Task, User } from '@db';
import clsx from 'clsx';
import { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { updateTaskOrder } from '../actions/updateTaskOrder';
import { ItemTypes, TaskCard, type DragItem, type StatusId } from './TaskCard';

// --- StatusGroup Component Props Interface ---
interface StatusGroupProps {
  status: { id: StatusId; title: string };
  tasks: Task[]; // Tasks belonging to this specific status group.
  handleDropTaskInternal: (item: DragItem, targetStatus: StatusId, hoverIndex: number) => void; // Callback for drops *between* different status groups.
  members: (Member & { user: User })[];
  statusFilter: string | null | undefined; // Current status filter applied from the URL.
}

/**
 * Renders a group of tasks for a specific status.
 * Handles dropping tasks from other statuses into this group.
 * Handles reordering tasks *within* this group.
 */
export function StatusGroup({
  status,
  tasks,
  handleDropTaskInternal,
  members,
  statusFilter,
}: StatusGroupProps) {
  // Ref for the inner task list div (might be needed for other interactions later)
  const taskListRef = useRef<HTMLDivElement>(null);
  // Ref for the outer div (header + list) which will be the main drop target
  const groupContainerRef = useRef<HTMLDivElement>(null);

  // Determine if the tasks within this group should be rendered based on the status filter.
  const shouldRenderTasks = !statusFilter || status.id === statusFilter;

  // Drop hook for the entire group area (header + list)
  const [{ isOver, canDrop }, groupDropRef] = useDrop(
    () => ({
      accept: ItemTypes.TASK,
      drop: (item: DragItem) => {
        console.log(
          'DEBUG: StatusGroup drop activated on status:',
          status.id,
          'for item:',
          item.id,
        );
        handleDropTaskInternal(item, status.id, tasks.length);
      },
      collect: (monitor) => ({
        // isOver will now be true if hovering over header OR list area
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [status.id, tasks.length, handleDropTaskInternal],
  );

  // Attach the main group drop ref to the outer container
  groupDropRef(groupContainerRef);

  // Handles the reordering logic when a task is dropped within this specific group.
  async function handleDropReorder(dragIndex: number, hoverIndex: number) {
    // Create a new array representing the desired order after the drop.
    const reorderedTasks = [...tasks];
    const [draggedItem] = reorderedTasks.splice(dragIndex, 1);
    // Ensure the hover index is valid after removing the dragged item.
    const validHoverIndex = Math.min(hoverIndex, reorderedTasks.length);
    reorderedTasks.splice(validHoverIndex, 0, draggedItem);

    // Prepare the payload for the server action, assigning new sequential order values.
    const updates = reorderedTasks.map((task, idx) => ({
      id: task.id,
      order: idx, // The new order is simply the index in the reordered array.
      status: task.status as StatusId,
    }));

    // Call the server action to persist the new order.
    await updateTaskOrder(updates);
  }

  return (
    // Attach group drop ref here
    <div ref={groupContainerRef} key={status.id} className="rounded-sm">
      {/* Status Group Header */}
      <div className="bg-muted/50 flex items-center py-2 pr-2 pl-6">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {status.title}
        </h2>
        <span className="text-muted-foreground ml-2 text-xs">{tasks.length}</span>
      </div>

      {/* Task List Area - Only apply visual feedback here */}
      <div
        ref={taskListRef} // Keep separate ref if needed elsewhere
        className={clsx(
          // Remove py-px
          'transition-colors duration-150 ease-in-out', // Keep transitions
          {
            // Background highlights when hovering EITHER header or list area
            'bg-secondary/50': isOver && canDrop,
            hidden: !shouldRenderTasks,
          },
        )}
      >
        {/* Render tasks ONLY if not filtered */}
        {shouldRenderTasks &&
          tasks.map((task, idx) => (
            <TaskCard
              key={task.id}
              task={task}
              members={members}
              isLast={idx === tasks.length - 1}
              index={idx}
              onDropReorder={handleDropReorder}
              handleDropTaskInternal={handleDropTaskInternal}
            />
          ))}

        {/* Placeholder ONLY when empty AND dragging over */}
        {shouldRenderTasks && tasks.length === 0 && isOver && canDrop && (
          <div className="text-muted-foreground m-2 rounded-sm border border-dashed p-4 text-center text-sm">
            Drop task here
          </div>
        )}
      </div>
    </div>
  );
}
