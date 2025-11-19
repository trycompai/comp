'use client';

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { StatusIndicator } from '@/components/status-indicator';
import { formatDate } from '@/lib/format';
import { Badge } from '@comp/ui/badge';
import { Policy } from '@db';
import { type ColumnDef, type Row } from '@tanstack/react-table';
import { ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { usePolicyTailoringStatus } from './policy-tailoring-context';

export type PolicyTailoringStatus = 'queued' | 'pending' | 'processing' | 'completed';

export function getPolicyColumns(orgId: string): ColumnDef<Policy>[] {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Policy Name" />,
      cell: ({ row }) => <PolicyNameCell row={row} orgId={orgId} />,
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
      cell: ({ row }) => <PolicyStatusCell row={row} />,
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

function PolicyNameCell({ row, orgId }: { row: Row<Policy>; orgId: string }) {
  const policyName = row.getValue('name') as string;
  const policyHref = `/${orgId}/policies/${row.original.id}`;
  const status = usePolicyTailoringStatus(row.original.id);
  const isTailoring =
    status === 'queued' || status === 'pending' || status === 'processing';

  if (isTailoring) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-3 animate-spin text-primary" />
        <span className="max-w-[31.25rem] truncate font-medium text-muted-foreground">
          {policyName}
        </span>
      </div>
    );
  }

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
}

function PolicyStatusCell({ row }: { row: Row<Policy> }) {
  const status = usePolicyTailoringStatus(row.original.id);
  const isTailoring =
    status === 'queued' || status === 'pending' || status === 'processing';

  if (isTailoring) {
    const label =
      status === 'processing'
        ? 'Tailoring'
        : status === 'queued'
          ? 'Queued'
          : 'Preparing';
    return (
      <div className="flex items-center gap-2 text-sm text-primary">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </div>
    );
  }

  return <StatusIndicator status={row.original.status} />;
}
