'use client';

import type { AccessGrant } from '@/hooks/use-access-requests';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import type { ColumnDef } from '@tanstack/react-table';
import { Mail } from 'lucide-react';

export type GrantTableRow = AccessGrant;

interface GrantColumnHandlers {
  onRevoke: (row: AccessGrant) => void;
  onResendAccess: (row: AccessGrant) => void;
}

export function buildGrantColumns({
  onRevoke,
  onResendAccess,
}: GrantColumnHandlers): ColumnDef<GrantTableRow>[] {
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
      accessorKey: 'subjectEmail',
      header: 'Identity',
      cell: ({ row }) => {
        return <span className="font-medium text-sm">{row.original.subjectEmail}</span>;
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
              status === 'active'
                ? 'default'
                : status === 'revoked'
                  ? 'destructive'
                  : 'secondary'
            }
            className="capitalize"
          >
            {status}
          </Badge>
        );
      },
    },
    {
      id: 'expires',
      accessorKey: 'expiresAt',
      header: 'Expires',
      cell: ({ row }) => {
        return (
          <span className="text-sm">
            {new Date(row.original.expiresAt).toLocaleDateString()}
          </span>
        );
      },
    },
    {
      id: 'revokedAt',
      accessorKey: 'revokedAt',
      header: 'Revoked',
      cell: ({ row }) => {
        if (!row.original.revokedAt) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }
        return (
          <span className="text-sm">
            {new Date(row.original.revokedAt).toLocaleDateString()}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const grant = row.original;

        if (grant.status === 'active') {
          return (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onResendAccess(grant)}
                className="h-8 px-2"
              >
                Resend Access
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onRevoke(grant)}
                className="h-8 px-2"
              >
                Revoke
              </Button>
            </div>
          );
        }

        return null;
      },
    },
  ];
}
