import { useAccessGrants } from '@/hooks/use-access-requests';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@comp/ui/table';
import { useState } from 'react';
import { RevokeDialog } from './revoke-dialog';

export function GrantsTab({ orgId }: { orgId: string }) {
  const { data, isLoading } = useAccessGrants(orgId);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading grants...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="p-4 text-muted-foreground">No access grants yet</div>;
  }

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
          {data.map((grant) => (
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
          ))}
        </TableBody>
      </Table>
      {revokeId && (
        <RevokeDialog orgId={orgId} grantId={revokeId} onClose={() => setRevokeId(null)} />
      )}
    </div>
  );
}
