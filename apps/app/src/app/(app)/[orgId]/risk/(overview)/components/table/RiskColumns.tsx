import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { StatusIndicator } from '@/components/status-indicator';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Badge } from '@comp/ui/badge';
import type { ColumnDef } from '@tanstack/react-table';
import { UserIcon } from 'lucide-react';
import Link from 'next/link';
import { RiskRow } from '../../RisksTable';

export const columns = (orgId: string, t: (content: string) => string): ColumnDef<RiskRow>[] => [
  {
    id: 'title',
    accessorKey: 'title',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t("Risk")} />,
    cell: ({ row }) => {
      return (
        <Link href={`/${orgId}/risk/${row.original.id}`}>
          <span className="line-clamp-1 capitalize">{row.original.title}</span>
        </Link>
      );
    },
    meta: {
      label: t('Risk'),
      placeholder: t('Search for a risk...'),
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
    header: ({ column }) => <DataTableColumnHeader column={column} title={t("Status")} />,
    cell: ({ row }) => {
      return <StatusIndicator status={row.original.status} />;
    },
    meta: {
      label: t('Status'),
    },
    enableColumnFilter: true,
    enableSorting: true,
  },
  {
    id: 'department',
    accessorKey: 'department',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t("Department")} />,
    cell: ({ row }) => {
      return (
        <Badge variant="marketing" className="w-fit uppercase">
          {row.original.department}
        </Badge>
      );
    },
    meta: {
      label: t('Department'),
    },
    enableColumnFilter: true,
    enableSorting: true,
  },
  {
    id: 'assignee',
    accessorKey: 'assignee.name',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t("Assignee")} />,
    enableSorting: false,
    cell: ({ row }) => {
      if (!row.original.assignee) {
        return (
          <div className="flex items-center gap-2">
            <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
              <UserIcon className="text-muted-foreground h-4 w-4" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">{t("None")}</p>
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
      label: t('Assignee'),
    },
    enableColumnFilter: true,
  },
];
