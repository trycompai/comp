'use client';

import {
  useAccessRequests,
  useApproveAccessRequest,
  useDenyAccessRequest,
} from '@/hooks/use-access-requests';
import { Badge } from '@trycompai/ui/badge';
import { Button } from '@trycompai/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@trycompai/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@trycompai/ui/table';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

export function TrustAccessRequestsClient() {
  const params = useParams();
  const orgId = params.orgId as string;

  const { data: requests, isPending, error } = useAccessRequests(orgId);

  const { mutate: approve, isPending: isApproving } = useApproveAccessRequest(orgId);
  const { mutate: deny, isPending: isDenying } = useDenyAccessRequest(orgId);

  const handleApprove = (requestId: string) => {
    approve(requestId, {
      onSuccess: () => toast.success('Access request approved'),
      onError: () => toast.error('Failed to approve request'),
    });
  };

  const handleDeny = (requestId: string) => {
    const reason = prompt('Reason for denial:');
    if (reason) {
      deny(
        { requestId, reason },
        {
          onSuccess: () => toast.success('Access request denied'),
          onError: () => toast.error('Failed to deny request'),
        },
      );
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      under_review: 'default',
      approved: 'secondary',
      denied: 'destructive',
      canceled: 'secondary',
    };

    return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
  };

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">Failed to load access requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Trust Access Requests</h1>
        <p className="text-muted-foreground">Manage data access requests from external users</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Access Requests</CardTitle>
          <CardDescription>Review and approve/deny requests for data access</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Requested Reports</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : requests?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No access requests yet
                  </TableCell>
                </TableRow>
              ) : (
                requests?.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.name}</TableCell>
                    <TableCell>{request.email}</TableCell>
                    <TableCell>{request.company || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {request.requestedScopes.map((scope) => (
                          <Badge key={scope} variant="outline">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {request.status === 'under_review' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request.id)}
                            disabled={isApproving}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeny(request.id)}
                            disabled={isDenying}
                          >
                            Deny
                          </Button>
                        </div>
                      )}
                      {request.status === 'approved' && request.grant && (
                        <div className="text-sm text-muted-foreground">
                          Expires: {new Date(request.grant.expiresAt).toLocaleDateString()}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
