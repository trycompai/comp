import { useAccessGrants } from '@/hooks/use-access-requests';
import { Badge } from '@trycompai/ui/badge';
import { Button } from '@trycompai/ui/button';
import { Skeleton } from '@trycompai/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@trycompai/ui/table';
import { useState } from 'react';
import { RevokeDialog } from './revoke-dialog';

export function GrantsTab({ orgId }: { orgId: string }) {
  const { data, isLoading } = useAccessGrants(orgId);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Revoked</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index} className="h-[45px]">
                <TableCell className="w-[260px]">
                  <Skeleton className="h-3.5 w-[80%]" />
                </TableCell>
                <TableCell className="w-[120px]">
                  <Skeleton className="h-5 w-[70%]" />
                </TableCell>
                <TableCell className="w-[160px]">
                  <Skeleton className="h-3.5 w-[60%]" />
                </TableCell>
                <TableCell className="w-[160px]">
                  <Skeleton className="h-3.5 w-[60%]" />
                </TableCell>
                <TableCell className="w-[140px]">
                  <Skeleton className="h-3.5 w-[70%]" />
                </TableCell>
              </TableRow>
            ))
          ) : data && data.length > 0 ? (
            data.map((grant) => (
              <TableRow key={grant.id}>
                <TableCell>{grant.subjectEmail}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      grant.status === 'active'
                        ? 'default'
                        : grant.status === 'revoked'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {grant.status}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(grant.expiresAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  {grant.revokedAt ? new Date(grant.revokedAt).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>
                  {grant.status === 'active' && (
                    <Button size="sm" variant="destructive" onClick={() => setRevokeId(grant.id)}>
                      Revoke
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                No access grants yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {revokeId && (
        <RevokeDialog orgId={orgId} grantId={revokeId} onClose={() => setRevokeId(null)} />
      )}
    </div>
  );
}
