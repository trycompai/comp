import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { VendorStatus } from '@/components/vendor-status';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Badge } from '@comp/ui/badge';
import type { ColumnDef } from '@tanstack/react-table';
import { UserIcon } from 'lucide-react';
import Link from 'next/link';
import type { GetVendorsResult } from '../data/queries';
import type { InlineTranslationOptions } from 'gt-next/types';

type VendorRow = GetVendorsResult['data'][number];

export const getColumns = (t: (content: string, options?: InlineTranslationOptions) => string) => {
  return [
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }: { column: any }) => {
      return <DataTableColumnHeader column={column} title={t('Vendor Name')} />;
    },
    cell: ({ row }: { row: any }) => {
      return (
        <Link href={`/${row.original.organizationId}/vendors/${row.original.id}`}>
          {row.original.name}
        </Link>
      );
    },
    meta: {
      label: t('Vendor Name'),
      placeholder: t('Search for vendor name...'),
      variant: 'text' as const,
    },
    size: 250,
    minSize: 200,
    maxSize: 300,
    enableColumnFilter: true,
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: ({ column }: { column: any }) => {
      return <DataTableColumnHeader column={column} title={t('Status')} />;
    },
    cell: ({ row }: { row: any }) => {
      return <VendorStatus status={row.original.status} />;
    },
    meta: {
      label: t('Status'),
      placeholder: t('Search by status...'),
      variant: 'select' as const,
    },
  },
  {
    id: 'category',
    accessorKey: 'category',
    header: ({ column }: { column: any }) => {
      return <DataTableColumnHeader column={column} title={t('Category')} />;
    },
    cell: ({ row }: { row: any }) => {
      const categoryMap: Record<string, string> = {
        cloud: t('Cloud'),
        infrastructure: t('Infrastructure'),
        software_as_a_service: t('SaaS'),
        finance: t('Finance'),
        marketing: t('Marketing'),
        sales: t('Sales'),
        hr: t('HR'),
        other: t('Other'),
      };

      return (
        <Badge variant="marketing" className="w-fit">
          {categoryMap[row.original.category] || row.original.category}
        </Badge>
      );
    },
    meta: {
      label: t('Category'),
      placeholder: t('Search by category...'),
      variant: 'select' as const,
    },
  },
  {
    id: 'assignee',
    accessorKey: 'assignee',
    header: ({ column }: { column: any }) => {
      return <DataTableColumnHeader column={column} title={t('Assignee')} />;
    },
    enableSorting: false,
    cell: ({ row }: { row: any }) => {
      // Handle null assignee
      if (!row.original.assignee) {
        return (
          <div className="flex items-center gap-2">
            <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
              <UserIcon className="text-muted-foreground h-4 w-4" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">{t('None')}</p>
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
              t('Unknown User')}
          </p>
        </div>
      );
    },
    meta: {
      label: t('Assignee'),
      placeholder: t('Search by assignee...'),
      variant: 'select' as const,
    },
  },
];
};
