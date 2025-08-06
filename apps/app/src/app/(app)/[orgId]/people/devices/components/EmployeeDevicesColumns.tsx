'use client';

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { FleetPolicy } from '../types';

export const getGetEmployeeDevicesColumns = (t: (content: string) => string) => {
  return [
    {
      id: 'computer_name',
      accessorKey: 'computer_name',
      header: ({ column }: { column: any }) => (
        <DataTableColumnHeader column={column} title={t('Device Name')} />
      ),
      cell: ({ row }: { row: any }) => {
        return (
          <div className="flex items-center gap-2">
            <span className="max-w-[31.25rem] truncate font-medium">
              {row.getValue('computer_name')}
            </span>
          </div>
        );
      },
    },
    {
      id: 'policies',
      accessorKey: 'policies',
      enableColumnFilter: false,
      enableSorting: false,
      header: ({ column }: { column: any }) => (
        <DataTableColumnHeader column={column} title={t('Is Compliant')} />
      ),
      cell: ({ row }: { row: any }) => {
        const policies = row.getValue('policies') as FleetPolicy[];
        const isCompliant = policies.every((policy) => policy.response === 'pass');
        return isCompliant ? (
          <CheckCircle2 size={16} className="text-green-500" />
        ) : (
          <XCircle size={16} className="text-red-500" />
        );
      },
    },
  ];
};
