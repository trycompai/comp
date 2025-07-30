'use client';
import { AssignedUser } from '@/components/assigned-user';
import { StatusIndicator } from '@/components/status-indicator';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import type { Departments, RiskStatus } from '@db';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export type RiskRegisterType = {
  id: string;
  title: string;
  status: RiskStatus;
  department?: Departments;
  assigneeId: string;
  assignee: {
    user: {
      image: string;
      name: string;
    };
  };
};

export function useColumns(): ColumnDef<RiskRegisterType>[] {
  const { orgId } = useParams<{ orgId: string }>();

  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Risk',
      cell: ({ row }) => {
        const status = row.original.status;

        return (
          <div className="flex flex-col gap-1">
            <Button variant="link" className="justify-start p-0" asChild>
              <Link href={`/${orgId}/risk/${row.original.id}`}>
                <span className="truncate">{row.original.title}</span>
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
      header: () => <span className="hidden md:table-cell">{'Status'}</span>,
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
      id: 'department',
      accessorKey: 'department',
      header: () => <span className="hidden md:table-cell">{'Department'}</span>,
      cell: ({ row }) => {
        const department = row.original.department;

        if (!department) {
          return <span className="hidden md:table-cell">—</span>;
        }

        return (
          <span className="hidden md:table-cell">
            <Badge variant="marketing">{department.replace(/_/g, ' ').toUpperCase()}</Badge>
          </span>
        );
      },
    },
    {
      id: 'assigneeId',
      accessorKey: 'assigneeId',
      header: () => <span className="hidden md:table-cell">{'Assignee'}</span>,
      cell: ({ row }) => {
        return (
          <div className="hidden md:table-cell">
            <AssignedUser
              fullName={row.original.assignee?.user?.name}
              avatarUrl={row.original.assignee?.user?.image}
            />
          </div>
        );
      },
    },
  ];
}
