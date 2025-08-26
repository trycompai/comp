'use client';

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { FleetPolicy, Host } from '../types';

export function getEmployeeDevicesColumns(): ColumnDef<Host>[] {
  return [
    {
      id: 'computer_name',
      accessorKey: 'computer_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Device Name" />,
      cell: ({ row }) => {
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Is Compliant" />,
      cell: ({ row }) => {
        const policies = row.getValue('policies') as FleetPolicy[];
        const isCompliant = policies.every((policy) => policy.response === 'pass');
        return isCompliant ? (
          <CheckCircle2 size={16} className="text-primary" />
        ) : (
          <XCircle size={16} className="text-red-500" />
        );
      },
    },
  ];
}
