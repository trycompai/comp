'use client';

import type {
  AccessRequest,
  useApproveAccessRequest,
  useDenyAccessRequest,
} from '@/hooks/use-access-requests';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import type { ColumnDef } from '@tanstack/react-table';

type ApproveHook = ReturnType<typeof useApproveAccessRequest>;
type DenyHook = ReturnType<typeof useDenyAccessRequest>;

export function columns({
  approve,
  deny,
}: {
  approve: ApproveHook;
  deny: DenyHook;
}): ColumnDef<AccessRequest>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-muted-foreground text-xs">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: 'company',
      header: 'Company',
      cell: ({ getValue }) => (getValue() as string | null) ?? '-',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const variant =
          status === 'approved' ? 'secondary' : status === 'denied' ? 'destructive' : 'default';
        return <Badge variant={variant}>{status.replace('_', ' ')}</Badge>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        if (row.original.status === 'under_review') {
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  approve.mutate({
                    requestId: row.original.id,
                    durationDays: row.original.requestedDurationDays ?? 30,
                  })
                }
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  const reason = window.prompt('Reason for denial:');
                  if (reason) deny.mutate({ requestId: row.original.id, reason });
                }}
              >
                Deny
              </Button>
            </div>
          );
        }

        if (row.original.status === 'approved' && row.original.grant) {
          return (
            <span className="text-xs text-muted-foreground">
              Expires: {new Date(row.original.grant.expiresAt).toLocaleDateString()}
            </span>
          );
        }

        return null;
      },
    },
  ];
}
