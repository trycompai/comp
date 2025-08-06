import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Badge } from '@comp/ui/badge';
import { Task, TaskStatus } from '@db';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export interface VendorTaskType {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string;
  owner: {
    name: string;
    image: string;
  };
}

export const getUseGetColumnHeaders = (t: (content: string) => string) => {
  const { vendorId, orgId } = useParams<{
    vendorId: string;
    orgId: string;
  }>();

  return [
    {
      accessorKey: 'title',
      header: t('Title'),
      cell: ({ row }: { row: any }) => {
        const title = row.getValue('title') as string;
        return (
          <Link
            href={`/${orgId}/vendors/${vendorId}/tasks/${row.original.id}`}
            className="cursor-pointer hover:underline"
          >
            {title}
          </Link>
        );
      },
    },
    {
      accessorKey: 'description',
      header: t('Description'),
    },
    {
      accessorKey: 'status',
      header: t('Status'),
      cell: ({ row }: { row: any }) => {
        const status = row.getValue('status') as TaskStatus;
        return (
          <Badge
            variant={
              status === TaskStatus.done
                ? 'secondary'
                : status === TaskStatus.in_progress
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
      header: t('Due Date'),
      cell: ({ row }: { row: any }) => {
        const date = row.getValue('dueDate') as string;
        if (!date) return '-';
        return format(new Date(date), 'PP');
      },
    },
    {
      accessorKey: 'owner',
      header: t('Owner'),
      cell: ({ row }: { row: any }) => {
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
};
