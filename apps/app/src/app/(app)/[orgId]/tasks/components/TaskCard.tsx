'use client';

import type { Member, Task, User } from '@db';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { TaskStatusSelector } from './TaskStatusSelector';
import { format } from 'date-fns';

// DnD Item Type identifier for tasks.
export const ItemTypes = {
  TASK: 'task',
};

// Type representing valid task status IDs.
export type StatusId = 'todo' | 'in_progress' | 'done' | 'failed' | 'not_relevant';

// Interface for the data transferred during drag operations.
export interface DragItem {
  type: typeof ItemTypes.TASK;
  id: string;
  status: StatusId; // Original status of the dragged item.
  index: number; // Original index within its group.
}

// --- TaskCard Component Props Interface ---
interface TaskCardProps {
  task: Task;
  members: (Member & { user: User })[];
  isLast: boolean; // Indicates if this is the last card in its group.
  index: number; // Current index within its rendered group.
  onDropReorder: (dragIndex: number, hoverIndex: number) => void; // Callback when dropped for reordering.
  handleDropTaskInternal: (item: DragItem, targetStatus: StatusId, hoverIndex: number) => void;
}

/**
 * Renders a single task card, supporting drag-and-drop for reordering and status changes.
 * Displays task details, status indicator, assignee, and type.
 * Shows a drop indicator when another task is dragged over it.
 */
export function TaskCard({
  task,
  members,
  isLast,
  index,
  onDropReorder,
  handleDropTaskInternal,
}: TaskCardProps) {
  const dragRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // State for indicator: type ('reorder' or 'move') and position ('top' or 'bottom')
  const [indicator, setIndicator] = useState<{
    type: 'reorder' | 'move';
    position: 'top' | 'bottom';
  } | null>(null);

  // react-dnd setup for making the card draggable.
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ItemTypes.TASK,
      // Data passed when dragging starts.
      item: {
        type: ItemTypes.TASK,
        id: task.id,
        index,
        status: task.status as StatusId,
      },
      collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
      // Clear the drop indicator when dragging ends.
      end: () => {
        setIndicator(null);
      },
    }),
    [task.id, index, task.status],
  );

  // react-dnd setup for making the card a drop target for reordering.
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.TASK,
    // Logic executed when a draggable item hovers over this card.
    hover(item: DragItem, monitor) {
      if (!dropRef.current || item.id === task.id) {
        setIndicator(null);
        return;
      }

      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const hoverBoundingRect = dropRef.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      const position = hoverClientY < hoverMiddleY ? 'top' : 'bottom';

      // Determine indicator type based on whether status matches
      const type = item.status === task.status ? 'reorder' : 'move';
      setIndicator({ type, position });
    },
    // Logic executed when a draggable item is dropped onto this card.
    drop: (item: DragItem, monitor) => {
      setIndicator(null);
      if (monitor.didDrop() || item.id === task.id) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Call the appropriate handler based on whether status matches
      if (item.status === task.status) {
        // Reordering within the same status group
        if (dragIndex !== hoverIndex) {
          onDropReorder(dragIndex, hoverIndex);
          item.index = hoverIndex; // Update item index for dnd internal state
        }
      } else {
        // Moving to a different status group
        handleDropTaskInternal(item, task.status as StatusId, hoverIndex);
      }
    },
    // Collect dragging state information.
    collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }), // Use shallow: true
  });

  // Effect to clear the indicator if the drag moves off this card.
  useEffect(() => {
    if (!isOver) {
      setIndicator(null);
    }
  }, [isOver]);

  // Callback ref to assign both drag and drop refs to the same DOM node.
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      dragRef.current = node;
      dropRef.current = node;
      drag(node);
      drop(node);
    },
    [drag, drop],
  );

  const router = useRouter();
  const pathname = usePathname();

  // Memoized calculation to find the assigned member's data.
  const assignedMember = useMemo(() => {
    if (!task.assigneeId) return null;
    return members.find((m) => m.id === task.assigneeId);
  }, [task.assigneeId, members]);

  // Navigation handler for clicking on the task card.
  const handleNavigate = () => {
    const targetPath = `${pathname}/${task.id}`;
    router.push(targetPath);
  };

  return (
    <div
      ref={setRefs}
      className={`group relative flex w-full items-center pr-2 ${!isLast ? 'border-border border-b' : ''} ${
        isDragging ? 'bg-muted opacity-30' : 'hover:bg-muted/50 opacity-100'
      }`}
    >
      {/* Reorder Indicator (Solid Line) */}
      {indicator?.type === 'reorder' && indicator.position === 'top' && (
        <div className="bg-primary absolute top-0 right-0 left-0 z-10 h-0.5" />
      )}
      {indicator?.type === 'reorder' && indicator.position === 'bottom' && (
        <div className="bg-primary absolute right-0 bottom-0 left-0 z-10 h-0.5" />
      )}

      {/* Move Indicator (Dashed Line) */}
      {indicator?.type === 'move' && indicator.position === 'top' && (
        <div className="absolute top-[-1px] right-2 left-2 z-10 h-[2px]">
          <div className="border-primary h-full w-full border-t-2 border-dashed" />
        </div>
      )}
      {indicator?.type === 'move' && indicator.position === 'bottom' && (
        <div className="absolute right-2 bottom-[-1px] left-2 z-10 h-[2px]">
          <div className="border-primary h-full w-full border-b-2 border-dashed" />
        </div>
      )}

      {/* Main Task Card Content Area */}
      <div className="text-muted-foreground/50 flex h-8 w-6 shrink-0 cursor-grab items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
        <span className="text-xs">::</span>
      </div>
      <div className="mr-2 flex shrink-0 items-center justify-center">
        <TaskStatusSelector task={task} />
      </div>

      <div
        className="flex flex-grow items-center h-full min-w-0 cursor-pointer"
        onClick={handleNavigate}
      >
        <span className="min-w-0 flex-grow truncate py-2 text-sm">{task.title}</span>
        <div className="ml-auto flex shrink-0 items-center space-x-3 pl-2">
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {task.createdAt
              ? format(new Date(task.createdAt), 'MMM d, yyyy')
              : ''}
          </span>
          <div className="bg-muted flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border">
            {assignedMember?.user?.image ? (
              <Image
                src={assignedMember.user.image}
                alt={assignedMember.user.name ?? 'Assignee'}
                width={20}
                height={20}
                className="object-cover"
              />
            ) : (
              <span className="text-muted-foreground text-[10px]">
                {assignedMember?.user?.name?.charAt(0) ?? '?'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
