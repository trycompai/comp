'use client';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { useDataTable } from '@/hooks/use-data-table';
import { Input } from '@comp/ui/input';
import type { Control, Task } from '@db';
import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

interface RequirementControlsTableProps {
  controls: Control[];
  tasks: (Task & { controls: Control[] })[];
}

export function RequirementControlsTable({ controls, tasks }: RequirementControlsTableProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const [searchTerm, setSearchTerm] = useState('');

  // Define columns for the controls table
  const columns = useMemo<ColumnDef<Control>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title={'Control'} />,
        cell: ({ row }) => (
          <div className="flex w-[300px] flex-col">
            <Link href={`/${orgId}/controls/${row.original.id}`} className="flex flex-col">
              <span className="truncate font-medium">{row.original.name}</span>
            </Link>
          </div>
        ),
        enableSorting: true,
        size: 300,
        minSize: 200,
        maxSize: 400,
        enableResizing: true,
      },
    ],
    [orgId],
  );

  // Filter controls data based on search term
  const filteredControls = useMemo(() => {
    if (!controls?.length) return [];
    if (!searchTerm.trim()) return controls;

    const searchLower = searchTerm.toLowerCase();
    return controls.filter((control) => control.name.toLowerCase().includes(searchLower));
  }, [controls, searchTerm]);

  // Set up the controls table
  const table = useDataTable({
    data: filteredControls,
    columns,
    pageCount: 1,
    shallow: false,
    getRowId: (row) => row.id,
    initialState: {
      sorting: [{ id: 'name', desc: false }],
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Input
          placeholder={'Search controls...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        {/* <div className="ml-auto">
					<DataTableSortList table={table.table} />
				</div> */}
      </div>
      <DataTable
        table={table.table}
        rowClickBasePath={`/${orgId}/controls`}
        getRowId={(row) => row.id}
      />
    </div>
  );
}
