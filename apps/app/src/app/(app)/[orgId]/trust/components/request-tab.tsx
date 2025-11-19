import { useAccessRequests, usePreviewNda, useResendNda } from '@/hooks/use-access-requests';
import { Badge } from '@trycompai/ui/badge';
import { Button } from '@trycompai/ui/button';
import { Skeleton } from '@trycompai/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@trycompai/ui/table';
import { useState } from 'react';
import { toast } from 'sonner';
import { ApproveDialog } from './approve-dialog';
import { DenyDialog } from './deny-dialog';

export function RequestsTab({ orgId }: { orgId: string }) {
  const { data, isLoading } = useAccessRequests(orgId);
  const { mutateAsync: resendNda } = useResendNda(orgId);
  const { mutateAsync: previewNda } = usePreviewNda(orgId);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [denyId, setDenyId] = useState<string | null>(null);

  const handleResendNda = (requestId: string) => {
    toast.promise(resendNda(requestId), {
      loading: 'Resending...',
      success: 'NDA email resent',
      error: 'Failed to resend NDA',
    });
  };

  const handlePreviewNda = async (requestId: string) => {
    toast.promise(
      previewNda(requestId).then((result) => {
        window.open(result.pdfDownloadUrl, '_blank');
        return result;
      }),
      {
        loading: 'Generating preview...',
        success: 'Preview NDA generated',
        error: 'Failed to generate preview',
      },
    );
  };

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
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>NDA</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index} className="h-[45px]">
                <TableCell className="w-[120px]">
                  <Skeleton className="h-3.5 w-[70%]" />
                </TableCell>
                <TableCell className="w-[180px]">
                  <Skeleton className="h-3.5 w-[80%]" />
                </TableCell>
                <TableCell className="w-[220px]">
                  <Skeleton className="h-3.5 w-[80%]" />
                </TableCell>
                <TableCell className="w-[160px]">
                  <Skeleton className="h-3.5 w-[70%]" />
                </TableCell>
                <TableCell className="max-w-xs">
                  <Skeleton className="h-3.5 w-[90%]" />
                </TableCell>
                <TableCell className="w-[80px]">
                  <Skeleton className="h-3.5 w-[60%]" />
                </TableCell>
                <TableCell className="w-[110px]">
                  <Skeleton className="h-5 w-[70%]" />
                </TableCell>
                <TableCell className="w-[110px]">
                  <Skeleton className="h-5 w-[70%]" />
                </TableCell>
                <TableCell className="w-[220px]">
                  <Skeleton className="h-3.5 w-[80%]" />
                </TableCell>
              </TableRow>
            ))
          ) : data && data.length > 0 ? (
            data.map((request) => {
              const ndaPending = request.status === 'approved' && !request.grant;
              return (
                <TableRow key={request.id}>
                  <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{request.name}</TableCell>
                  <TableCell>{request.email}</TableCell>
                  <TableCell>{request.company || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">{request.purpose || '-'}</TableCell>
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
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleResendNda(request.id)}
                        >
                          Resend NDA
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePreviewNda(request.id)}
                      >
                        Preview
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                No access requests yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {approveId && (
        <ApproveDialog orgId={orgId} requestId={approveId} onClose={() => setApproveId(null)} />
      )}
      {denyId && <DenyDialog orgId={orgId} requestId={denyId} onClose={() => setDenyId(null)} />}
    </div>
  );
}
