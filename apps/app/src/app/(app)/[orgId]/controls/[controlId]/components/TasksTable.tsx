'use client';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { StatusIndicator } from '@/components/status-indicator';
import { useDataTable } from '@/hooks/use-data-table';
import { Icons } from '@comp/ui/icons';
import { Input } from '@comp/ui/input';
import { Task } from '@db';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

interface TasksTableProps {
  tasks: Task[];
  orgId: string;
  controlId: string;
}

export function TasksTable({ tasks, orgId, controlId }: TasksTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Define columns for tasks table
  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title={'Title'} />,
        cell: ({ row }) => {
          const title = row.original.title;
          return <span>{title}</span>;
        },
        enableSorting: true,
        sortingFn: (rowA, rowB, columnId) => {
          const nameA = rowA.original.title || '';
          const nameB = rowB.original.title || '';
          return nameA.localeCompare(nameB);
        },
      },
      {
        accessorKey: 'description',
        header: ({ column }) => <DataTableColumnHeader column={column} title={'Description'} />,
        cell: ({ row }) => {
          const description = row.original.description;
          return <span className="line-clamp-1 capitalize">{description}</span>;
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title={'Status'} />,
        cell: ({ row }) => {
          const rawStatus = row.original.status;

          // Pass the mapped status directly to StatusIndicator
          return <StatusIndicator status={rawStatus} />;
        },
      },
    ],
    [],
  );

  // Filter tasks data based on search term
  const filteredTasks = useMemo(() => {
    if (!searchTerm.trim()) return tasks;

    const searchLower = searchTerm.toLowerCase();
    return tasks.filter(
      (task) =>
        task.id.toLowerCase().includes(searchLower) ||
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower),
    );
  }, [tasks, searchTerm]);

  // Set up the tasks table
  const table = useDataTable({
    data: filteredTasks,
    columns,
    pageCount: 1,
    shallow: false,
    getRowId: (row) => row.id,
    initialState: {
      sorting: [{ id: 'createdAt', desc: true }],
    },
    tableId: 't',
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Input
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
          leftIcon={<Icons.Search size={16} />}
        />
      </div>

      <DataTable
        table={table.table}
        rowClickBasePath={`/${orgId}/`}
        getRowId={(row) => `/tasks/${row.id}`}
        tableId={'t'}
      />
    </div>
  );
}
