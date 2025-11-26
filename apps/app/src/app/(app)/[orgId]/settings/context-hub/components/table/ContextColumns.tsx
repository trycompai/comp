'use client';

import { deleteContextEntryAction } from '@/actions/context-hub/delete-context-entry-action';
import { updateContextEntryAction } from '@/actions/context-hub/update-context-entry-action';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { isJSON } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@comp/ui/alert-dialog';
import { Button } from '@comp/ui/button';
import { Textarea } from '@comp/ui/textarea';
import type { Context } from '@db';
import type { ColumnDef } from '@tanstack/react-table';
import { Check, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// Question cell (read-only display)
function QuestionCell({ context }: { context: Context }) {
  return <span>{context.question}</span>;
}

// Editable answer cell - click to edit
function EditableAnswerCell({ context }: { context: Context }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(context.answer);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { execute, status } = useAction(updateContextEntryAction, {
    onSuccess: () => {
      setIsEditing(false);
      toast.success('Answer updated');
    },
    onError: () => {
      setValue(context.answer);
      toast.error('Failed to update answer');
    },
  });

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Reset value when context changes
  useEffect(() => {
    setValue(context.answer);
  }, [context.answer]);

  const handleSave = useCallback(() => {
    if (value.trim() && value !== context.answer) {
      execute({ id: context.id, question: context.question, answer: value });
    } else {
      setIsEditing(false);
      setValue(context.answer);
    }
  }, [value, context.answer, context.id, context.question, execute]);

  const handleCancel = useCallback(() => {
    setValue(context.answer);
    setIsEditing(false);
  }, [context.answer]);

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-h-[100px] text-sm"
          disabled={status === 'executing'}
        />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={status === 'executing'}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={handleSave}
            disabled={status === 'executing'}
          >
            {status === 'executing' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>
    );
  }

  // Render clickable content with hover state
  const renderContent = () => {
    if (isJSON(context.answer)) {
      return (
        <>
          {Object.entries(JSON.parse(context.answer))
            .filter(([, val]) => !!val)
            .map(([key, val]) => (
              <div key={key}>
                <span className="font-medium capitalize">{key}:</span>
                <span>{val as string}</span>
              </div>
            ))}
        </>
      );
    }
    return <span className="line-clamp-3">{context.answer}</span>;
  };

  return (
    <div
      className="group relative cursor-pointer rounded-xs px-2 py-1.5 -mx-2 -my-1.5 hover:bg-muted/50 transition-colors"
      onClick={() => setIsEditing(true)}
    >
      <div className="pr-6">{renderContent()}</div>
      <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// Delete button cell
function DeleteCell({ context }: { context: Context }) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { execute, status } = useAction(deleteContextEntryAction, {
    onSuccess: () => {
      setDeleteOpen(false);
    },
  });

  return (
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Entry</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this entry? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => execute({ id: context.id })}
            disabled={status === 'executing'}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {status === 'executing' ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const columns = (): ColumnDef<Context>[] => [
  {
    id: 'question',
    accessorKey: 'question',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Question" />,
    cell: ({ row }) => <QuestionCell context={row.original} />,
    meta: { label: 'Question', variant: 'text' },
    size: 250,
    minSize: 200,
    maxSize: 300,
    enableColumnFilter: true,
    enableSorting: true,
  },
  {
    id: 'answer',
    accessorKey: 'answer',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Answer" />,
    cell: ({ row }) => <EditableAnswerCell context={row.original} />,
    meta: { label: 'Answer' },
    enableColumnFilter: true,
    enableSorting: false,
    size: 400,
    minSize: 300,
    maxSize: 500,
  },
  {
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <DeleteCell context={row.original} />,
    meta: { label: 'Actions' },
    enableColumnFilter: false,
    enableSorting: false,
    size: 50,
    minSize: 50,
  },
];
