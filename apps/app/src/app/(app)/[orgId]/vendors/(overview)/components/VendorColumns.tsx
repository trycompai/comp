import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { VendorStatus } from '@/components/vendor-status';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Badge } from '@comp/ui/badge';
import type { ColumnDef } from '@tanstack/react-table';
import { UserIcon } from 'lucide-react';
import Link from 'next/link';
import type { GetVendorsResult } from '../data/queries';
import { VendorDeleteCell } from './VendorDeleteCell';

type VendorRow = GetVendorsResult['data'][number];

export const columns: ColumnDef<VendorRow>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Vendor Name" />;
    },
    cell: ({ row }) => {
      return (
        <Link href={`/${row.original.organizationId}/vendors/${row.original.id}`}>
          {row.original.name}
        </Link>
      );
    },
    meta: {
      label: 'Vendor Name',
      placeholder: 'Search for vendor name...',
      variant: 'text',
    },
    size: 250,
    minSize: 200,
    maxSize: 300,
    enableColumnFilter: true,
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Status" />;
    },
    cell: ({ row }) => {
      return <VendorStatus status={row.original.status} />;
    },
    meta: {
      label: 'Status',
      placeholder: 'Search by status...',
      variant: 'select',
    },
  },
  {
    id: 'category',
    accessorKey: 'category',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Category" />;
    },
    cell: ({ row }) => {
      const categoryMap: Record<string, string> = {
        cloud: 'Cloud',
        infrastructure: 'Infrastructure',
        software_as_a_service: 'SaaS',
        finance: 'Finance',
        marketing: 'Marketing',
        sales: 'Sales',
        hr: 'HR',
        other: 'Other',
      };

      return (
        <Badge variant="marketing" className="w-fit">
          {categoryMap[row.original.category] || row.original.category}
        </Badge>
      );
    },
    meta: {
      label: 'Category',
      placeholder: 'Search by category...',
      variant: 'select',
    },
  },
  {
    id: 'assignee',
    accessorKey: 'assignee',
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Assignee" />;
    },
    enableSorting: false,
    cell: ({ row }) => {
      // Handle null assignee
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
              src={row.original.assignee.user?.image || undefined}
              alt={row.original.assignee.user?.name || row.original.assignee.user?.email || ''}
            />
            <AvatarFallback>
              {row.original.assignee.user?.name?.charAt(0) ||
                row.original.assignee.user?.email?.charAt(0).toUpperCase() ||
                '?'}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm font-medium">
            {row.original.assignee.user?.name ||
              row.original.assignee.user?.email ||
              'Unknown User'}
          </p>
        </div>
      );
    },
    meta: {
      label: 'Assignee',
      placeholder: 'Search by assignee...',
      variant: 'select',
    },
  },
  {
    id: 'delete-vendor',
    cell: ({ row }) => {
      return <VendorDeleteCell vendor={row.original} />;
    },
    enableSorting: false,
    enableHiding: false,
  },
];
