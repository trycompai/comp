import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface TaskItemEditableTitleProps {
  title: string;
  isUpdating: boolean;
  onUpdate: (updates: { title?: string }) => Promise<void>;
  onAfterUpdate?: () => void;
}

export function TaskItemEditableTitle({
  title,
  isUpdating,
  onUpdate,
  onAfterUpdate,
}: TaskItemEditableTitleProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditedTitle(title);
  }, [title]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleSave = async () => {
    if (!editedTitle.trim()) {
      toast.error('Title cannot be empty');
      setEditedTitle(title);
      setIsEditingTitle(false);
      return;
    }

    if (editedTitle.trim() === title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      await onUpdate({ title: editedTitle.trim() });
      setIsEditingTitle(false);
      toast.success('Title updated');
      onAfterUpdate?.();
    } catch {
      toast.error('Failed to update title');
      setEditedTitle(title);
    }
  };

  return (
    <div>
      {isEditingTitle ? (
        <div>
          <textarea
            ref={titleInputRef}
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleTitleSave();
              }
              if (e.key === 'Escape') {
                setEditedTitle(title);
                setIsEditingTitle(false);
              }
            }}
            disabled={isUpdating}
            className="w-full text-2xl font-semibold bg-transparent border-none outline-none resize-none rounded px-2 py-1 -mx-2 -my-1 overflow-hidden"
            rows={1}
          />
        </div>
      ) : (
        <h1
          onClick={() => setIsEditingTitle(true)}
          className="text-2xl font-semibold cursor-text hover:bg-accent/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
        >
          {title}
        </h1>
      )}
    </div>
  );
}


