'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@trycompai/ui';
import { Maximize2 } from 'lucide-react';
import { useState } from 'react';

interface EditableCellProps {
  value: string | null;
  rowId: string;
  columnId: string;
  onUpdate: (rowId: string, columnId: string, value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  // When set, the cell keeps the quick single-line edit on click but also
  // offers a large multi-line editor (hover icon or right-click) for long
  // values like control descriptions.
  expandable?: boolean;
  expandTitle?: string;
}

export function EditableCell({
  value,
  rowId,
  columnId,
  onUpdate,
  disabled = false,
  placeholder = 'Click to edit',
  expandable = false,
  expandTitle = 'Edit',
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? '');
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandValue, setExpandValue] = useState(value ?? '');

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

  const handleStartEditing = () => {
    setEditValue(value ?? '');
    setIsEditing(true);
  };

  const handleOpenExpanded = () => {
    if (disabled) return;
    setExpandValue(value ?? '');
    setIsExpanded(true);
  };

  const handleExpandSave = () => {
    if (expandValue !== (value ?? '')) {
      onUpdate(rowId, columnId, expandValue);
    }
    setIsExpanded(false);
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

  if (!expandable) {
    return (
      <span
        className="hover:bg-muted/50 block cursor-text truncate px-2 py-1.5 text-sm"
        onClick={handleStartEditing}
      >
        {value || <span className="text-muted-foreground italic">{placeholder}</span>}
      </span>
    );
  }

  return (
    <div
      className="group relative"
      onContextMenu={(e) => {
        e.preventDefault();
        handleOpenExpanded();
      }}
    >
      <span
        className="hover:bg-muted/50 block cursor-text truncate px-2 py-1.5 pr-7 text-sm"
        onClick={handleStartEditing}
      >
        {value || <span className="text-muted-foreground italic">{placeholder}</span>}
      </span>
      <button
        type="button"
        aria-label="Open large editor"
        title="Open large editor (or right-click)"
        className="text-muted-foreground hover:text-foreground absolute right-1 top-1.5 rounded-xs p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          handleOpenExpanded();
        }}
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>{expandTitle}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={expandValue}
            onChange={(e) => setExpandValue(e.target.value)}
            autoFocus
            className="min-h-[260px] font-mono text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExpanded(false)}>
              Cancel
            </Button>
            <Button onClick={handleExpandSave} disabled={expandValue === (value ?? '')}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
