'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEffect, useState } from 'react';
import { useCardOrder } from '../hooks/useCardOrder';
import { SortableCard } from './SortableCard';

interface DraggableCardsProps {
  children: React.ReactNode[];
  onReorder?: (newOrder: number[]) => void;
}

export function DraggableCards({ children, onReorder }: DraggableCardsProps) {
  const [items, setItems] = useState(children);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { order, updateOrder } = useCardOrder(children.map((_, index) => index));

  // Ensure component is mounted before rendering drag-and-drop functionality
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reorder items when order changes from localStorage
  useEffect(() => {
    if (order.length === children.length) {
      const reorderedItems = order.map((index) => children[index]);
      setItems(reorderedItems);
    }
  }, [order, children]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((_, index) => `card-${index}` === active.id);
      const newIndex = items.findIndex((_, index) => `card-${index}` === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      // Update the stored order - map each position to the original card index
      const newOrder = newItems.map((item, newPosition) => {
        // Find which original card (from children) this item represents
        const originalIndex = children.findIndex((child) => child === item);
        return originalIndex;
      });

      console.log('Drag reorder:', {
        oldIndex,
        newIndex,
        newItems: newItems.map((_, i) => `card-${i}`),
        newOrder,
        childrenLength: children.length,
      });

      updateOrder(newOrder);

      // Call the onReorder callback with the new order
      if (onReorder) {
        onReorder(newOrder);
      }
    }

    setActiveId(null);
  };

  // Don't render drag-and-drop functionality until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {children.map((child, index) => (
          <div key={`card-${index}`} className="h-full">
            {child}
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((_, index) => `card-${index}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 select-none">
          {items.map((child, index) => (
            <SortableCard key={`card-${index}`} id={`card-${index}`}>
              <div className="h-full">{child}</div>
            </SortableCard>
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeId ? (
          <div className="opacity-90 transform rotate-1 shadow-2xl">
            {items.find((_, index) => `card-${index}` === activeId)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
