'use client';

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@trycompai/design-system';
import type { DeviceWithChecks } from '../types';

const CHECK_NAMES: Record<string, string> = {
  disk_encryption: 'Disk Encryption',
  antivirus: 'Antivirus',
  password_policy: 'Password Policy',
  screen_lock: 'Screen Lock',
};

const PLATFORM_LABELS: Record<string, string> = {
  macos: 'macOS',
  windows: 'Windows',
};

export function getDeviceColumns(): ColumnDef<DeviceWithChecks>[] {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Device Name" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="max-w-[31.25rem] truncate font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      id: 'user',
      accessorFn: (row) => row.user.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{row.original.user.name}</span>
          <span className="text-muted-foreground text-xs">{row.original.user.email}</span>
        </div>
      ),
    },
    {
      id: 'platform',
      accessorKey: 'platform',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Platform" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm">
            {PLATFORM_LABELS[row.original.platform] ?? row.original.platform}
          </span>
          <span className="text-muted-foreground text-xs">{row.original.osVersion}</span>
        </div>
      ),
    },
    {
      id: 'lastCheckIn',
      accessorKey: 'lastCheckIn',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last Check-in" />,
      cell: ({ row }) => {
        const lastCheckIn = row.original.lastCheckIn;
        if (!lastCheckIn) {
          return <span className="text-muted-foreground text-sm">Never</span>;
        }
        const date = new Date(lastCheckIn);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        let timeAgo: string;
        if (diffHours < 1) {
          timeAgo = 'Just now';
        } else if (diffHours < 24) {
          timeAgo = `${diffHours}h ago`;
        } else {
          const diffDays = Math.floor(diffHours / 24);
          timeAgo = `${diffDays}d ago`;
        }

        return <span className="text-sm">{timeAgo}</span>;
      },
    },
    {
      id: 'checks',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Checks" />,
      enableColumnFilter: false,
      enableSorting: false,
      cell: ({ row }) => {
        const checks = row.original.checks;
        return (
          <div className="flex flex-wrap gap-1">
            {checks.map((check) => (
              <Badge key={check.checkType} variant={check.passed ? 'default' : 'destructive'}>
                {CHECK_NAMES[check.checkType] ?? check.checkType}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: 'isCompliant',
      accessorKey: 'isCompliant',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Compliant" />,
      cell: ({ row }) => {
        const isCompliant = row.original.isCompliant;
        return (
          <span
            className={`text-sm ${isCompliant ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {isCompliant ? 'Yes' : 'No'}
          </span>
        );
      },
    },
  ];
}
