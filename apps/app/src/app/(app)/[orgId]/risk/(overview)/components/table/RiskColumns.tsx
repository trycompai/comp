import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { StatusIndicator } from '@/components/status-indicator';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Badge } from '@comp/ui/badge';
import type { ColumnDef } from '@tanstack/react-table';
import { Loader2, UserIcon } from 'lucide-react';
import Link from 'next/link';
import { RiskRow } from '../../RisksTable';
import { useRiskOnboardingStatus } from '../risk-onboarding-context';

export const columns = (orgId: string): ColumnDef<RiskRow>[] => [
  {
    id: 'title',
    accessorKey: 'title',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Risk" />,
    cell: ({ row }) => {
      return <RiskNameCell row={row} orgId={orgId} />;
    },
    meta: {
      label: 'Risk',
      placeholder: 'Search for a risk...',
      variant: 'text',
    },
    size: 250,
    minSize: 200,
    maxSize: 300,
    enableColumnFilter: true,
    enableSorting: true,
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      return <RiskStatusCell row={row} />;
    },
    meta: {
      label: 'Status',
    },
    enableColumnFilter: true,
    enableSorting: true,
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
    id: 'assignee',
    accessorKey: 'assignee.name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Assignee" />,
    enableSorting: false,
    cell: ({ row }) => {
      if (!row.original.assignee) {
        return (
          <div className="flex items-center gap-2">
            <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
              <UserIcon className="text-muted-foreground h-4 w-4" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">None</p>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={row.original.assignee.image || undefined}
              alt={row.original.assignee.name || row.original.assignee.email || ''}
            />
            <AvatarFallback>
              {row.original.assignee.name?.charAt(0) ||
                row.original.assignee.email?.charAt(0).toUpperCase() ||
                '?'}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm font-medium">
            {row.original.assignee.name || row.original.assignee.email}
          </p>
        </div>
      );
    },
    meta: {
      label: 'Assignee',
    },
    enableColumnFilter: true,
  },
];

function RiskNameCell({ row, orgId }: { row: { original: RiskRow }; orgId: string }) {
  const risk = row.original;
  const status = useRiskOnboardingStatus(risk.id);
  const isPending = risk.isPending;
  // Don't show active status if risk is already closed (mitigated)
  const isResolved = risk.status === 'closed';
  const isActive =
    !isResolved &&
    (status === 'pending' ||
      status === 'processing' ||
      status === 'created' ||
      status === 'assessing');

  if (isPending || isActive) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="line-clamp-1 capitalize">{risk.title}</span>
      </div>
    );
  }

  return (
    <Link href={`/${orgId}/risk/${risk.id}`}>
      <span className="line-clamp-1 capitalize">{risk.title}</span>
    </Link>
  );
}

function RiskStatusCell({ row }: { row: { original: RiskRow } }) {
  const risk = row.original;
  const status = useRiskOnboardingStatus(risk.id);
  const isPending = risk.isPending;
  const isResolved = risk.status === 'closed';
  // Don't show assessing if risk is already resolved
  const isAssessing = !isResolved && (risk.isAssessing || status === 'assessing');
  const isActive =
    !isResolved &&
    (status === 'pending' ||
      status === 'processing' ||
      status === 'created' ||
      status === 'assessing');

  if (isPending || isActive) {
    const statusText =
      status === 'pending' || status === 'processing' || isPending
        ? 'Creating...'
        : status === 'assessing' || isAssessing
          ? 'Assessing...'
          : 'Processing...';

    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-muted-foreground text-sm">{statusText}</span>
      </div>
    );
  }

  return <StatusIndicator status={risk.status} />;
}
