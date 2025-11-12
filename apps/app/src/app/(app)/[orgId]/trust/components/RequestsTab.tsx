import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@trycompai/ui/table';
import { Button } from '@trycompai/ui/button';
import { Badge } from '@trycompai/ui/badge';
import { useAccessRequests, useResendNda } from '@/hooks/use-access-requests';
import { ApproveDialog } from './ApproveDialog';
import { DenyDialog } from './DenyDialog';
import { toast } from 'sonner';

export function RequestsTab({ orgId }: { orgId: string }) {
  const { data, isLoading } = useAccessRequests(orgId);
  const { mutateAsync: resendNda } = useResendNda(orgId);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [denyId, setDenyId] = useState<string | null>(null);

  const handleResendNda = (requestId: string) => {
    toast.promise(resendNda(requestId), {
      loading: 'Resending...',
      success: 'NDA email resent',
      error: 'Failed to resend NDA',
    });
  };

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading requests...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="p-4 text-muted-foreground">No access requests yet</div>;
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Requested</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Purpose</TableHead>
            <TableHead>Scopes</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>NDA</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((request) => {
            const ndaPending = request.status === 'approved' && !request.grant;
            return (
              <TableRow key={request.id}>
                <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>{request.name}</TableCell>
                <TableCell>{request.email}</TableCell>
                <TableCell>{request.company || '-'}</TableCell>
                <TableCell className="max-w-xs truncate">{request.purpose || '-'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {request.requestedScopes.slice(0, 2).map((scope) => (
                      <Badge key={scope} variant="secondary" className="text-xs">
                        {scope}
                      </Badge>
                    ))}
                    {request.requestedScopes.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{request.requestedScopes.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{request.requestedDurationDays ?? 30}d</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      request.status === 'approved'
                        ? 'default'
                        : request.status === 'denied'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {ndaPending ? (
                    <Badge variant="warning">pending</Badge>
                  ) : request.grant ? (
                    <Badge variant="default">signed</Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={request.status !== 'under_review'}
                      onClick={() => setApproveId(request.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={request.status !== 'under_review'}
                      onClick={() => setDenyId(request.id)}
                    >
                      Deny
                    </Button>
                    {ndaPending && (
                      <Button size="sm" variant="secondary" onClick={() => handleResendNda(request.id)}>
                        Resend NDA
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {approveId && <ApproveDialog orgId={orgId} requestId={approveId} onClose={() => setApproveId(null)} />}
      {denyId && <DenyDialog orgId={orgId} requestId={denyId} onClose={() => setDenyId(null)} />}
    </div>
  );
}
