"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface SortableCardProps {
  id: string;
  children: React.ReactNode;
}

export function SortableCard({ id, children }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative h-full ${isDragging ? "z-50" : ""} transition-all duration-200`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="bg-background border-muted hover:bg-muted/50 absolute -top-2 -left-2 z-10 cursor-grab rounded-xs border p-1 opacity-0 shadow-sm transition-all duration-200 group-hover:opacity-100 hover:scale-110 active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical className="text-muted-foreground h-3 w-3" />
      </div>

      {/* Card Content */}
      <div
        className={`relative h-full transition-all duration-200 ${isDragging ? "scale-105 shadow-lg" : "group-hover:shadow-sm"}`}
      >
        {children}
      </div>
    </div>
  );
}
