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
import { useRef, useState } from 'react';
import { loadEditorSize, saveEditorSize, type EditorSize } from './editor-size-storage';

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
  // Notified when the large editor opens/closes so the parent can highlight
  // the row currently being edited.
  onExpandedChange?: (open: boolean) => void;
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
  onExpandedChange,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? '');
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandValue, setExpandValue] = useState(value ?? '');
  // Remembered editor size (FRAME-3): the large editor is resizable in both
  // directions and reopens at the size the user last left it.
  const [editorSize, setEditorSize] = useState<EditorSize | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep local open state and the parent notification in lockstep so the row
  // highlight tracks the dialog exactly (open icon, right-click, save, cancel,
  // Esc, and overlay click all route through here).
  const setExpanded = (open: boolean) => {
    setIsExpanded(open);
    onExpandedChange?.(open);
  };

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
    setEditorSize(loadEditorSize());
    setExpanded(true);
  };

  const handleExpandSave = () => {
    if (expandValue !== (value ?? '')) {
      onUpdate(rowId, columnId, expandValue);
    }
    setExpanded(false);
  };

  // Persist the editor size after a resize-handle drag (fires on pointer
  // release). Skipped when unchanged so plain clicks don't thrash storage.
  const handleEditorResizeEnd = () => {
    const el = textareaRef.current;
    if (!el) return;
    const next: EditorSize = { width: el.offsetWidth, height: el.offsetHeight };
    if (editorSize && next.width === editorSize.width && next.height === editorSize.height) {
      return;
    }
    setEditorSize(next);
    saveEditorSize(next);
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

      <Dialog open={isExpanded} onOpenChange={setExpanded}>
        <DialogContent className="max-h-[95vh] w-fit max-w-[95vw] overflow-y-auto sm:max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>{expandTitle}</DialogTitle>
          </DialogHeader>
          <Textarea
            ref={textareaRef}
            value={expandValue}
            onChange={(e) => setExpandValue(e.target.value)}
            onMouseUp={handleEditorResizeEnd}
            autoFocus
            className="max-h-[80vh] max-w-[92vw] min-h-[260px] min-w-[320px] resize font-mono text-sm"
            style={
              editorSize
                ? { width: editorSize.width, height: editorSize.height }
                : { width: 680 }
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpanded(false)}>
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
