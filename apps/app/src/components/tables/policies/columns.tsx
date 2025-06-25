'use client';

import { StatusIndicator } from '@/components/status-indicator';
import { formatDate } from '@/utils/format';
import { Button } from '@comp/ui/button';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export type PolicyType = {
  id: string;
  policy: {
    id: string;
    name: string;
    description: string | null;
    slug: string;
  };
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
};

export function useColumns(): ColumnDef<PolicyType>[] {
  const { orgId } = useParams<{ orgId: string }>();

  return [
    {
      id: 'name',
      accessorKey: 'policy.name',
      cell: ({ row }) => {
        const name = row.original.policy.name;
        const id = row.original.id;
        const status = row.original.status;

        return (
          <div className="flex flex-col gap-1">
            <Button variant="link" className="justify-start p-0" asChild>
              <Link href={`/${orgId}/policies/${id}`}>
                <span className="truncate">{name}</span>
              </Link>
            </Button>
            <div className="md:hidden">
              <StatusIndicator status={status} />
            </div>
          </div>
        );
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      cell: ({ row }) => {
        const status = row.original.status;

        return (
          <div className="hidden items-center gap-2 md:flex">
            <StatusIndicator status={status} />
          </div>
        );
      },
    },
    {
      id: 'updatedAt',
      accessorKey: 'updatedAt',
      cell: ({ row }) => {
        const date = row.original.updatedAt;

        return <div className="text-muted-foreground">{formatDate(date, 'MMM d, yyyy')}</div>;
      },
    },
  ];
}
