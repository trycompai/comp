'use client';

import { useState } from 'react';

interface EditableCellProps {
  value: string | null;
  rowId: string;
  columnId: string;
  onUpdate: (rowId: string, columnId: string, value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function EditableCell({
  value,
  rowId,
  columnId,
  onUpdate,
  disabled = false,
  placeholder = 'Click to edit',
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? '');

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== (value ?? '')) {
      onUpdate(rowId, columnId, editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setEditValue(value ?? '');
      setIsEditing(false);
    }
  };

  if (disabled) {
    return (
      <span className="text-muted-foreground block truncate px-2 py-1.5 text-sm">
        {value ?? ''}
      </span>
    );
  }

  if (isEditing) {
    return (
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        className="border-primary w-full rounded-xs border bg-transparent px-2 py-1 text-sm outline-none"
      />
    );
  }

  return (
    <span
      className="hover:bg-muted/50 block cursor-text truncate px-2 py-1.5 text-sm"
      onClick={() => {
        setEditValue(value ?? '');
        setIsEditing(true);
      }}
    >
      {value || <span className="text-muted-foreground italic">{placeholder}</span>}
    </span>
  );
}
