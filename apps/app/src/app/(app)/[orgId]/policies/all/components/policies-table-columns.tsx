'use client';

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { StatusIndicator } from '@/components/status-indicator';
import { formatDate } from '@/lib/format';
import { Policy } from '@db';
import { ColumnDef } from '@tanstack/react-table';

export const getGetPolicyColumns = (t: (content: string) => string) => {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} title={t("Policy Name")} />,
      cell: ({ row }: { row: any }) => {
        return (
          <div className="flex items-center gap-2">
            <span className="max-w-[31.25rem] truncate font-medium">{row.getValue('name')}</span>
          </div>
        );
      },
      meta: {
        label: t('Policy Name'),
        placeholder: t('Search for a policy...'),
        variant: 'text' as const,
      },
      enableColumnFilter: true,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} title={t("Status")} />,
      cell: ({ row }: { row: any }) => {
        return <StatusIndicator status={row.original.status} />;
      },
      meta: {
        label: t('Status'),
        placeholder: t('Search status...'),
        variant: 'select' as const,
      },
    },
    {
      id: 'updatedAt',
      accessorKey: 'updatedAt',
      header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} title={t("Last Updated")} />,
      cell: ({ row }: { row: any }) => {
        return <div className="text-muted-foreground">{formatDate(row.getValue('updatedAt'))}</div>;
      },
      meta: {
        label: t('Last Updated'),
        placeholder: t('Search last updated...'),
        variant: 'date' as const,
      },
    },
  ];
};
