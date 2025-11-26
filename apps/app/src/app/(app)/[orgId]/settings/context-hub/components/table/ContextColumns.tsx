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
  const [structuredValue, setStructuredValue] = useState<Record<string, string> | null>(null);
  const [arrayValue, setArrayValue] = useState<Record<string, string>[] | null>(null);
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

  // Parse structured data when entering edit mode
  useEffect(() => {
    if (isEditing && isJSON(context.answer)) {
      const parsed = JSON.parse(context.answer);
      if (Array.isArray(parsed)) {
        setArrayValue(parsed);
        setStructuredValue(null);
      } else if (typeof parsed === 'object') {
        setStructuredValue(parsed);
        setArrayValue(null);
      }
    }
  }, [isEditing, context.answer]);

  useEffect(() => {
    if (isEditing && textareaRef.current && !structuredValue && !arrayValue) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing, structuredValue, arrayValue]);

  // Reset value when context changes
  useEffect(() => {
    setValue(context.answer);
  }, [context.answer]);

  const handleSave = useCallback(() => {
    let finalValue = value;

    // Convert structured data back to JSON
    if (arrayValue) {
      finalValue = JSON.stringify(arrayValue);
    } else if (structuredValue) {
      finalValue = JSON.stringify(structuredValue);
    }

    if (finalValue.trim() && finalValue !== context.answer) {
      execute({ id: context.id, question: context.question, answer: finalValue });
    } else {
      setIsEditing(false);
      setValue(context.answer);
    }
  }, [value, arrayValue, structuredValue, context.answer, context.id, context.question, execute]);

  const handleCancel = useCallback(() => {
    setValue(context.answer);
    setStructuredValue(null);
    setArrayValue(null);
    setIsEditing(false);
  }, [context.answer]);

  // Update a field in structured object
  const updateStructuredField = (key: string, newValue: string) => {
    if (structuredValue) {
      setStructuredValue({ ...structuredValue, [key]: newValue });
    }
  };

  // Update a field in array item
  const updateArrayItem = (index: number, key: string, newValue: string) => {
    if (arrayValue) {
      const newArray = [...arrayValue];
      newArray[index] = { ...newArray[index], [key]: newValue };
      setArrayValue(newArray);
    }
  };

  // Add new item to array
  const addArrayItem = () => {
    if (arrayValue) {
      let template: Record<string, string>;
      if (arrayValue.length > 0) {
        // Clone the structure of the first item with empty values
        template = Object.keys(arrayValue[0]).reduce((acc, key) => ({ ...acc, [key]: '' }), {});
      } else {
        // For empty arrays, infer structure from question or use default
        if (
          context.question.toLowerCase().includes('c-suite') ||
          context.question.toLowerCase().includes('executive')
        ) {
          template = { name: '', title: '' };
        } else {
          template = { name: '', value: '' };
        }
      }
      setArrayValue([...arrayValue, template]);
    }
  };

  // Remove item from array
  const removeArrayItem = (index: number) => {
    if (arrayValue && arrayValue.length > 1) {
      setArrayValue(arrayValue.filter((_, i) => i !== index));
    }
  };

  if (isEditing) {
    // Render array editor (like cSuite)
    if (arrayValue) {
      return (
        <div className="flex flex-col gap-3">
          <div className="space-y-2">
            {arrayValue.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No items. Click "Add Item" to start.
              </p>
            )}
            {arrayValue.map((item, index) => {
              const keys = Object.keys(item);
              return (
                <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                  {keys.map((key) => (
                    <input
                      key={key}
                      type="text"
                      value={item[key] || ''}
                      onChange={(e) => updateArrayItem(index, key, e.target.value)}
                      placeholder={key}
                      className="flex-1 px-2 py-1 text-sm rounded border border-input bg-background"
                      disabled={status === 'executing'}
                    />
                  ))}
                  {arrayValue.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeArrayItem(index)}
                      disabled={status === 'executing'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addArrayItem}
            disabled={status === 'executing'}
            className="w-fit"
          >
            + Add Item
          </Button>
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

    // Render object editor (like reportSignatory)
    if (structuredValue) {
      return (
        <div className="flex flex-col gap-3">
          <div className="space-y-2">
            {Object.entries(structuredValue).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground capitalize w-20 shrink-0">
                  {key}
                </label>
                <input
                  type="text"
                  value={val || ''}
                  onChange={(e) => updateStructuredField(key, e.target.value)}
                  className="flex-1 px-2 py-1 text-sm rounded border border-input bg-background"
                  disabled={status === 'executing'}
                />
              </div>
            ))}
          </div>
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

    // Render plain text editor
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
      const parsed = JSON.parse(context.answer);

      // Handle arrays (like cSuite)
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          return <span className="text-muted-foreground/60 italic">Empty list</span>;
        }
        return (
          <div className="space-y-1">
            {parsed.map((item, index) => (
              <div key={index} className="text-sm">
                {typeof item === 'object'
                  ? Object.entries(item)
                      .filter(([, v]) => !!v)
                      .map(([, v]) => `${v}`)
                      .join(' — ')
                  : String(item)}
              </div>
            ))}
          </div>
        );
      }

      // Handle objects (like reportSignatory, shipping)
      return (
        <div className="space-y-0.5">
          {Object.entries(parsed)
            .filter(([, val]) => !!val)
            .map(([key, val]) => (
              <div key={key} className="text-sm">
                <span className="font-medium capitalize">{key}: </span>
                <span>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
              </div>
            ))}
        </div>
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
        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
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
