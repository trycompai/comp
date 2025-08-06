'use client';

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { StatusIndicator } from '@/components/status-indicator';
import { Column, ColumnDef, Row } from '@tanstack/react-table';
import { ControlWithRelations } from '../data/queries';
import { getControlStatus } from '../lib/utils';

export const getGetControlColumns = (
  t: (content: string) => string,
): ColumnDef<ControlWithRelations>[] => {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column }: { column: Column<ControlWithRelations> }) => (
        <DataTableColumnHeader column={column} title={t('Control Name')} />
      ),
      cell: ({ row }: { row: Row<ControlWithRelations> }) => {
        return (
          <div className="flex items-center gap-2">
            <span className="max-w-[31.25rem] truncate font-medium">{row.getValue('name')}</span>
          </div>
        );
      },
      meta: {
        label: t('Control Name'),
        placeholder: t('Search for a control...'),
        variant: 'text' as const,
      },
      enableColumnFilter: true,
      filterFn: (row: Row<ControlWithRelations>, id: string, value: string) => {
        return value.length === 0
          ? true
          : String(row.getValue(id)).toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: 'status',
      accessorKey: '',
      header: ({ column }: { column: Column<ControlWithRelations> }) => (
        <DataTableColumnHeader column={column} title={t('Status')} />
      ),
      cell: ({ row }: { row: Row<ControlWithRelations> }) => {
        const control = row.original;
        const status = getControlStatus(control);

        return <StatusIndicator status={status} />;
      },
      meta: {
        label: t('Status'),
        placeholder: t('Search status...'),
        variant: 'text' as const,
      },
      enableSorting: false,
    },
  ];
};
