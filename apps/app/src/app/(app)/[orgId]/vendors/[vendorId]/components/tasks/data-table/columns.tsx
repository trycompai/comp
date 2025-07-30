'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Badge } from '@comp/ui/badge';
import { VendorStatus } from '@db';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import Link from 'next/link';

export interface VendorTaskType {
  id: string;
  title: string;
  description: string;
  status: VendorStatus;
  dueDate: string;
  owner: {
    name: string;
    image: string;
  };
}

export function useColumns() {
  const columns: ColumnDef<VendorTaskType>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => {
        const title = row.getValue('title') as string;
        return <Link href={`/vendors/${row.original.id}/tasks/${row.original.id}`}>{title}</Link>;
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as VendorStatus;
        return (
          <Badge
            variant={
              status === VendorStatus.assessed
                ? 'secondary'
                : status === VendorStatus.in_progress
                  ? 'outline'
                  : 'default'
            }
          >
            {status
              .toLowerCase()
              .split('_')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => {
        const date = row.getValue('dueDate') as string;
        if (!date) return '-';
        return format(new Date(date), 'PP');
      },
    },
    {
      accessorKey: 'owner',
      header: 'Owner',
      cell: ({ row }) => {
        const owner = row.getValue('owner') as {
          name: string;
          image: string;
        };
        if (!owner) return '-';
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={owner.image} alt={owner.name} />
              <AvatarFallback>
                {owner.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{owner.name}</span>
          </div>
        );
      },
    },
  ];

  return columns;
}
