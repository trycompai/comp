'use client';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { StatusIndicator } from '@/components/status-indicator';
import { useDataTable } from '@/hooks/use-data-table';
import { Icons } from '@comp/ui/icons';
import { Input } from '@comp/ui/input';
import { Policy } from '@db';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

interface PoliciesTableProps {
  policies: Policy[];
  orgId: string;
  controlId: string;
}

export function PoliciesTable({ policies, orgId, controlId }: PoliciesTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const columns = useMemo<ColumnDef<Policy>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title={'Name'} />,
        cell: ({ row }) => {
          const name = row.original.name;
          return <span>{name}</span>;
        },
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const nameA = rowA.original.name || '';
          const nameB = rowB.original.name || '';
          return nameA.localeCompare(nameB);
        },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={'Created At'} />,
        cell: ({ row }) => <span>{new Date(row.original.createdAt).toLocaleDateString()}</span>,
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const dateA = new Date(rowA.original.createdAt);
          const dateB = new Date(rowB.original.createdAt);
          return dateA.getTime() - dateB.getTime();
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title={'Status'} />,
        cell: ({ row }) => {
          const rawStatus = row.original.status;
          return <StatusIndicator status={rawStatus} />;
        },
      },
    ],
    [],
  );

  const filteredPolicies = useMemo(() => {
    if (!searchTerm.trim()) return policies;

    const searchLower = searchTerm.toLowerCase();
    return policies.filter(
      (policy) =>
        (policy.name && policy.name.toLowerCase().includes(searchLower)) ||
        (policy.id && policy.id.toLowerCase().includes(searchLower)),
    );
  }, [policies, searchTerm]);

  const table = useDataTable({
    data: filteredPolicies,
    columns,
    pageCount: 1,
    shallow: false,
    getRowId: (row) => row.id,
    initialState: {
      sorting: [{ id: 'createdAt', desc: true }],
    },
    tableId: 'policiesTable',
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Input
          placeholder="Search policies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
          leftIcon={<Icons.Search size={16} />}
        />
      </div>

      <DataTable
        table={table.table}
        rowClickBasePath={`/${orgId}/policies/`}
        getRowId={(row) => row.id}
        tableId={'policiesTable'}
      />
    </div>
  );
}
