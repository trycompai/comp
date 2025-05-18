"use client";

import { Member, Task, TaskStatus, User } from "@comp/db/types";
import { Badge } from "@comp/ui/badge";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { TaskStatusIndicator } from "./TaskStatusIndicator";

// DnD Item Type identifier for tasks.
export const ItemTypes = {
	TASK: "task",
};

// Type representing valid task status IDs.
export type StatusId = "todo" | "in_progress" | "done";

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
	handleDropTaskInternal: (
		item: DragItem,
		targetStatus: StatusId,
		hoverIndex: number,
	) => void;
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
		type: "reorder" | "move";
		position: "top" | "bottom";
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

			const dragIndex = item.index;
			const hoverIndex = index;
			const clientOffset = monitor.getClientOffset();
			if (!clientOffset) return;

			const hoverBoundingRect = dropRef.current.getBoundingClientRect();
			const hoverMiddleY =
				(hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
			const hoverClientY = clientOffset.y - hoverBoundingRect.top;
			const position = hoverClientY < hoverMiddleY ? "top" : "bottom";

			// Determine indicator type based on whether status matches
			const type = item.status === task.status ? "reorder" : "move";
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
				handleDropTaskInternal(
					item,
					task.status as StatusId,
					hoverIndex,
				);
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

	// Helper to get Tailwind class for the entity type indicator dot.
	const getEntityTypeDotClass = (entityType: "control" | "risk" | "vendor"): string => {
		switch (entityType) {
			case "control":
				return "bg-blue-500";
			case "risk":
				return "bg-red-500";
			case "vendor":
				return "bg-green-500";
			default:
				return "bg-gray-500";
		}
	};

	// Navigation handler for clicking on the task card.
	const handleNavigate = () => {
		const targetPath = `${pathname}/${task.id}`;
		router.push(targetPath);
	};

	return (
		<div
			ref={setRefs}
			onClick={handleNavigate}
			className={`relative flex items-center w-full pr-2 group ${!isLast ? "border-b border-border" : ""} ${
				isDragging
					? "opacity-30 bg-muted"
					: "opacity-100 hover:bg-muted/50 cursor-pointer"
			}`}
		>
			{/* Reorder Indicator (Solid Line) */}
			{indicator?.type === "reorder" && indicator.position === "top" && (
				<div className="absolute top-0 left-0 right-0 h-0.5 bg-primary z-10" />
			)}
			{indicator?.type === "reorder" &&
				indicator.position === "bottom" && (
					<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary z-10" />
				)}

			{/* Move Indicator (Dashed Line) */}
			{indicator?.type === "move" && indicator.position === "top" && (
				<div className="absolute top-[-1px] left-2 right-2 h-[2px] z-10">
					<div className="w-full h-full border-t-2 border-dashed border-primary" />
				</div>
			)}
			{indicator?.type === "move" && indicator.position === "bottom" && (
				<div className="absolute bottom-[-1px] left-2 right-2 h-[2px] z-10">
					<div className="w-full h-full border-b-2 border-dashed border-primary" />
				</div>
			)}

			{/* Main Task Card Content Area */}
			<div className="flex items-center justify-center w-6 h-8 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab flex-shrink-0">
				<span className="text-xs">::</span>
			</div>
			<div className="flex items-center justify-center w-6 h-8 mr-2 flex-shrink-0">
				<TaskStatusIndicator status={task.status as TaskStatus} />
			</div>
			<span className="flex-grow py-2 truncate text-sm min-w-0">
				{task.title}
			</span>
			<div className="flex items-center ml-auto space-x-3 pl-2 flex-shrink-0">
				<span className="text-xs text-muted-foreground whitespace-nowrap">
					Apr 15
				</span>
				<div className="w-5 h-5 rounded-full bg-muted border overflow-hidden flex items-center justify-center">
					{assignedMember?.user?.image ? (
						<Image
							src={assignedMember.user.image}
							alt={assignedMember.user.name ?? "Assignee"}
							width={20}
							height={20}
							className="object-cover"
						/>
					) : (
						<span className="text-[10px] text-muted-foreground">
							{assignedMember?.user?.name?.charAt(0) ?? "?"}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
