import { deleteContextEntryAction } from '@/actions/context-hub/delete-context-entry-action';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import type { Context } from '@/lib/db';
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
import type { ColumnDef } from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';

// Extract the cell content into a separate component
function ContextDeleteCell({ context }: { context: Context }) {
  const [open, setOpen] = useState(false);
  const { execute, status } = useAction(deleteContextEntryAction, {
    onSuccess: () => {
      setOpen(false);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => setOpen(true)}
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
    cell: ({ row }) => <span>{row.original.question}</span>,
    meta: { label: 'Question', variant: 'text' },
    size: 200,
    minSize: 200,
    maxSize: 200,
    enableColumnFilter: true,
    enableSorting: true,
  },
  {
    id: 'answer',
    accessorKey: 'answer',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Answer" />,
    cell: ({ row }) => {
      if (isJSON(row.original.answer)) {
        return (
          <span>
            {Object.entries(JSON.parse(row.original.answer))
              .filter(([key, value]) => !!value)
              .map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium capitalize">{key}:</span>
                  <span>{value as string}</span>
                </div>
              ))}
          </span>
        );
      }

      return <span>{row.original.answer}</span>;
    },
    meta: { label: 'Answer' },
    enableColumnFilter: true,
    enableSorting: false,
    size: 300,
    minSize: 200,
    maxSize: 400,
  },
  {
    id: 'delete',
    header: () => <span>Delete</span>,
    cell: ({ row }) => <ContextDeleteCell context={row.original} />,
    meta: { label: 'Delete' },
    enableColumnFilter: false,
    enableSorting: false,
    size: 20,
    minSize: 20,
  },
];
