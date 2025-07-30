'use client';
import { AssignedUser } from '@/components/assigned-user';
import { StatusDate } from '@/components/status-date';
import { StatusIndicator } from '@/components/status-indicator';
import { Button } from '@comp/ui/button';
import type { RiskStatus } from '@db';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export type RiskTaskType = {
  id: string;
  riskId: string;
  title: string;
  status: RiskStatus;
  dueDate: string;
  assigneeId: string;
  assignee: {
    image: string;
    name: string;
  };
};

export function useColumns(): ColumnDef<RiskTaskType>[] {
  const { orgId } = useParams<{ orgId: string }>();

  return [
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Tasks',
      cell: ({ row }) => {
        return (
          <span className="truncate">
            <Button variant="link" className="p-0" asChild>
              <Link href={`/${orgId}/risk/${row.original.riskId}/tasks/${row.original.id}`}>
                {row.original.title}
              </Link>
            </Button>
          </span>
        );
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;

        return (
          <div className="flex items-center gap-2">
            <StatusIndicator status={status} />
          </div>
        );
      },
    },
    {
      id: 'dueDate',
      accessorKey: 'dueDate',
      header: () => <span className="hidden sm:table-cell">{'Due Date'}</span>,
      cell: ({ row }) => {
        const status = row.original.status;

        return (
          <div className="hidden sm:table-cell">
            <StatusDate date={new Date(row.original.dueDate)} isClosed={status === 'closed'} />
          </div>
        );
      },
    },
    {
      id: 'assigneeId',
      accessorKey: 'assigneeId',
      header: () => <span className="hidden sm:table-cell">{'Assigned To'}</span>,
      cell: ({ row }) => {
        return (
          <div className="hidden sm:table-cell">
            <AssignedUser
              fullName={row.original.assignee?.name}
              avatarUrl={row.original.assignee?.image}
            />
          </div>
        );
      },
    },
  ];
}
