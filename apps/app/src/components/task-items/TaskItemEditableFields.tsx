'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import type { TaskItem } from '@/hooks/use-task-items';

interface TaskItemEditableFieldsProps {
  taskItem: TaskItem;
  isUpdating: boolean;
  onUpdate: (updates: { title?: string; description?: string }) => Promise<void>;
  onStatusOrPriorityChange?: () => void;
}

export function TaskItemEditableFields({
  taskItem,
  isUpdating,
  onUpdate,
  onStatusOrPriorityChange,
}: TaskItemEditableFieldsProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState(taskItem.title);
  const [editedDescription, setEditedDescription] = useState(taskItem.description || '');

  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus();
    }
  }, [isEditingDescription]);

  const handleTitleSave = async () => {
    if (!editedTitle.trim()) {
      toast.error('Title cannot be empty');
      setEditedTitle(taskItem.title);
      setIsEditingTitle(false);
      return;
    }

    if (editedTitle.trim() === taskItem.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      await onUpdate({ title: editedTitle.trim() });
      setIsEditingTitle(false);
      toast.success('Title updated');
      onStatusOrPriorityChange?.();
    } catch (error) {
      toast.error('Failed to update title');
      setEditedTitle(taskItem.title);
    }
  };

  const handleDescriptionSave = async () => {
    const newDescription = editedDescription.trim();
    if (newDescription === (taskItem.description || '')) {
      setIsEditingDescription(false);
      return;
    }

    try {
      await onUpdate({ description: newDescription || undefined });
      setIsEditingDescription(false);
      toast.success('Description updated');
      onStatusOrPriorityChange?.();
    } catch (error) {
      toast.error('Failed to update description');
      setEditedDescription(taskItem.description || '');
    }
  };

  return (
    <>
      {/* Title - Inline editable */}
      <div className="space-y-2 mt-2">
        {isEditingTitle ? (
          <div className="space-y-2">
            <textarea
              ref={titleInputRef}
              value={editedTitle}
              onChange={(e) => {
                setEditedTitle(e.target.value);
                // Auto-resize textarea
                if (titleInputRef.current) {
                  titleInputRef.current.style.height = 'auto';
                  titleInputRef.current.style.height = `${titleInputRef.current.scrollHeight}px`;
                }
              }}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleTitleSave();
                }
                if (e.key === 'Escape') {
                  setEditedTitle(taskItem.title);
                  setIsEditingTitle(false);
                }
              }}
              disabled={isUpdating}
              className="w-full text-2xl font-semibold bg-transparent border-none outline-none resize-none rounded px-2 py-1 -mx-2 -my-1 overflow-hidden"
              rows={1}
            />
            <p className="text-xs text-muted-foreground">
              Press Cmd+Enter to save, Esc to cancel
            </p>
          </div>
        ) : (
          <h1
            onClick={() => setIsEditingTitle(true)}
            className="text-2xl font-semibold cursor-text hover:bg-accent/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
          >
            {taskItem.title}
          </h1>
        )}
      </div>

      {/* Description - Inline editable */}
      <div className="space-y-2">
        {isEditingDescription ? (
          <div className="space-y-2">
            <textarea
              ref={descriptionInputRef}
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onBlur={handleDescriptionSave}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditedDescription(taskItem.description || '');
                  setIsEditingDescription(false);
                }
              }}
              disabled={isUpdating}
              className="w-full text-base bg-transparent border-none outline-none resize-none rounded px-2 py-1 -mx-2 -my-1 min-h-[100px] leading-relaxed text-foreground/90"
              placeholder="Add a description..."
            />
          </div>
        ) : (
          <div
            onClick={() => setIsEditingDescription(true)}
            className="text-base cursor-text hover:bg-accent/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors min-h-[40px]"
          >
            {taskItem.description ? (
              <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                {taskItem.description}
              </p>
            ) : (
              <p className="text-muted-foreground italic leading-relaxed">
                Add a description...
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

