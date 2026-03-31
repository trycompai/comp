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
import { Edit2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownCellProps {
  value: string | null;
  rowId: string;
  columnId: string;
  onUpdate: (rowId: string, columnId: string, value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MarkdownCell({
  value,
  rowId,
  columnId,
  onUpdate,
  disabled = false,
  placeholder = 'Click to edit',
}: MarkdownCellProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editValue, setEditValue] = useState(value ?? '');

  // Sync editValue when value prop changes (but not when dialog is open to avoid overwriting user edits)
  useEffect(() => {
    if (!isDialogOpen) {
      setEditValue(value ?? '');
    }
  }, [value, isDialogOpen]);

  const handleOpen = () => {
    if (disabled) return;
    setEditValue(value ?? '');
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editValue !== (value ?? '')) {
      onUpdate(rowId, columnId, editValue);
    }
    setIsDialogOpen(false);
  };

  const handleCancel = () => {
    setEditValue(value ?? '');
    setIsDialogOpen(false);
  };

  const hasChanges = editValue !== (value ?? '');
  const markdownContent = value || '';

  return (
    <>
      <div
        className="hover:bg-muted/50 group relative cursor-pointer overflow-hidden px-2 py-1.5"
        onClick={handleOpen}
      >
        {markdownContent ? (
          <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-2 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Render links as non-clickable styled text in the cell view
                // This prevents navigation when clicking the cell to edit
                a: ({ children }) => <span className="text-primary underline">{children}</span>,
                p: ({ children }) => (
                  <p className="mb-0 text-sm leading-tight last:mb-0">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-0 ml-4 list-disc space-y-0 text-sm last:mb-0">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-0 ml-4 list-decimal space-y-0 text-sm last:mb-0">{children}</ol>
                ),
                li: ({ children }) => <li className="text-sm leading-tight">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => (
                  <code className="bg-muted rounded-xs px-1 py-0 text-xs font-mono">
                    {children}
                  </code>
                ),
                h1: ({ children }) => (
                  <h1 className="mb-0 text-sm font-semibold leading-tight last:mb-0">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mb-0 text-sm font-semibold leading-tight last:mb-0">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-0 text-xs font-medium leading-tight last:mb-0">{children}</h3>
                ),
              }}
            >
              {markdownContent}
            </ReactMarkdown>
          </div>
        ) : (
          <span className="text-muted-foreground italic text-sm">{placeholder}</span>
        )}
        {!disabled && (
          <div className="text-muted-foreground absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
            <Edit2 className="h-3 w-3" />
          </div>
        )}
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCancel();
          } else {
            setIsDialogOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Edit Description</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Enter markdown text..."
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
            {editValue && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">Preview</label>
                <div className="prose prose-sm dark:prose-invert max-w-none rounded-xs border border-border bg-muted/30 p-4">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{editValue}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
