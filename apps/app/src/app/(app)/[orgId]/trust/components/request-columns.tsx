'use client';

import type { AccessRequest } from '@/hooks/use-access-requests';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import type { ColumnDef } from '@tanstack/react-table';

export type RequestTableRow = AccessRequest;

interface RequestColumnHandlers {
  onApprove: (row: AccessRequest) => void;
  onDeny: (row: AccessRequest) => void;
  onResendNda: (row: AccessRequest) => void;
  onPreviewNda: (row: AccessRequest) => void;
}

export function buildRequestColumns({
  onApprove,
  onDeny,
  onResendNda,
  onPreviewNda,
}: RequestColumnHandlers): ColumnDef<RequestTableRow>[] {
  return [
    {
      id: 'date',
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) => {
        return (
          <span className="text-muted-foreground whitespace-nowrap text-xs">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        );
      },
    },
    {
      id: 'identity',
      accessorKey: 'email',
      header: 'Identity',
      cell: ({ row }) => {
        return (
          <div className="flex flex-col">
            <span className="font-medium text-sm">{row.original.name}</span>
            <span className="text-muted-foreground text-xs">{row.original.email}</span>
            {row.original.company && (
              <span className="text-muted-foreground text-xs">{row.original.company}</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'purpose',
      accessorKey: 'purpose',
      header: 'Purpose',
      cell: ({ row }) => {
        return (
          <div className="max-w-[200px] truncate text-sm" title={row.original.purpose || ''}>
            {row.original.purpose || '—'}
          </div>
        );
      },
    },
    {
      id: 'duration',
      accessorKey: 'requestedDurationDays',
      header: 'Duration',
      cell: ({ row }) => {
        return <span className="text-sm">{row.original.requestedDurationDays ?? 30}d</span>;
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge
            variant={
              status === 'approved' ? 'default' : status === 'denied' ? 'destructive' : 'secondary'
            }
            className="capitalize"
          >
            {status.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      id: 'ndaCheck',
      accessorKey: 'grant',
      header: 'NDA Status',
      cell: ({ row }) => {
        const ndaPending = row.original.status === 'approved' && !row.original.grant;

        if (ndaPending) {
          return <Badge variant="warning">Pending</Badge>;
        }

        if (row.original.grant) {
          return <Badge variant="default">Signed</Badge>;
        }

        return <span className="text-muted-foreground text-sm">—</span>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const request = row.original;
        const ndaPending = request.status === 'approved' && !request.grant;

        return (
          <div className="flex items-center gap-2">
            {request.status === 'under_review' && (
              <>
                <Button size="sm" onClick={() => onApprove(request)} className="h-8 px-2">
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDeny(request)}
                  className="h-8 px-2"
                >
                  Deny
                </Button>
              </>
            )}

            {ndaPending && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onResendNda(request)}
                className="h-8 px-2"
              >
                Resend NDA
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onPreviewNda(request)}
              className="h-8 px-2"
            >
              Preview
            </Button>
          </div>
        );
      },
    },
  ];
}
