'use client';

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { StatusIndicator } from '@/components/status-indicator';
import { formatDate } from '@/lib/format';
import { Badge } from '@comp/ui/badge';
import { Policy } from '@db';
import { ColumnDef } from '@tanstack/react-table';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

export function getPolicyColumns(orgId: string): ColumnDef<Policy>[] {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Policy Name" />,
      cell: ({ row }) => {
        const policyName = row.getValue('name') as string;
        const policyHref = `/${orgId}/policies/${row.original.id}`;

        return (
          <Link
            href={policyHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="group flex items-center gap-2"
          >
            <span className="max-w-[31.25rem] truncate font-medium group-hover:underline">
              {policyName}
            </span>
            <ExternalLink className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        );
      },
      meta: {
        label: 'Policy Name',
        placeholder: 'Search for a policy...',
        variant: 'text',
      },
      enableColumnFilter: true,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        return <StatusIndicator status={row.original.status} />;
      },
      meta: {
        label: 'Status',
        placeholder: 'Search status...',
        variant: 'select',
      },
    },
    {
      id: 'department',
      accessorKey: 'department',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Department" />,
      cell: ({ row }) => {
        return (
          <Badge variant="marketing" className="w-fit uppercase">
            {row.original.department}
          </Badge>
        );
      },
      meta: {
        label: 'Department',
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      id: 'updatedAt',
      accessorKey: 'updatedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last Updated" />,
      cell: ({ row }) => {
        return <div className="text-muted-foreground">{formatDate(row.getValue('updatedAt'))}</div>;
      },
      meta: {
        label: 'Last Updated',
        placeholder: 'Search last updated...',
        variant: 'date',
      },
    },
  ];
}
