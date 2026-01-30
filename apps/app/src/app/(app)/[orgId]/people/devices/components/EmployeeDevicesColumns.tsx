'use client';

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { FleetPolicy, Host } from '../types';
import { DeviceDropdownMenu } from './DeviceDropdownMenu';

function UserNameCell({ userName, memberId }: { userName: string | null | undefined; memberId: string | undefined }) {
  const params = useParams();
  const orgId = params?.orgId as string;

  if (!userName || !memberId) {
    return <span className="truncate font-medium">{userName || '-'}</span>;
  }

  return (
    <Link
      href={`/${orgId}/people/${memberId}`}
      className="truncate font-medium text-primary hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {userName}
    </Link>
  );
}

export function getEmployeeDevicesColumns(isCurrentUserOwner: boolean): ColumnDef<Host>[] {
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
      id: 'user_name',
      accessorKey: 'user_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
      cell: ({ row }) => {
        const userName = row.getValue('user_name') as string | null | undefined;
        const memberId = row.original.member_id;
        return (
          <div className="flex items-center gap-2">
            <UserNameCell userName={userName} memberId={memberId} />
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
    {
      id: 'actions',
      header: ({ column }) => <DataTableColumnHeader column={column} title="" />,
      enableColumnFilter: false,
      enableSorting: false,
      cell: ({ row }) => (
          <DeviceDropdownMenu host={row.original} isCurrentUserOwner={isCurrentUserOwner} />
        ),
    }
  ];
}
