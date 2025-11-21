import { useAccessRequests, usePreviewNda, useResendNda } from '@/hooks/use-access-requests';
import { Input } from '@comp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { useState } from 'react';
import { toast } from 'sonner';
import { ApproveDialog } from './approve-dialog';
import { DenyDialog } from './deny-dialog';
import { RequestDataTable } from './request-data-table';

export function RequestsTab({ orgId }: { orgId: string }) {
  const { data, isLoading } = useAccessRequests(orgId);
  const { mutateAsync: resendNda } = useResendNda(orgId);
  const { mutateAsync: previewNda } = usePreviewNda(orgId);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [denyId, setDenyId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | 'all'>('all');

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

  const filtered = (data ?? []).filter((request) => {
    const matchesSearch =
      !search ||
      request.email.toLowerCase().includes(search.toLowerCase()) ||
      request.name.toLowerCase().includes(search.toLowerCase()) ||
      (request.company ?? '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus = status === 'all' || request.status === status;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Search by name, email, or company"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 max-w-md"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-8 w-full md:w-[200px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="under_review">Under review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <RequestDataTable
        data={filtered}
        isLoading={isLoading}
        onApprove={(row) => setApproveId(row.id)}
        onDeny={(row) => setDenyId(row.id)}
        onResendNda={(row) => handleResendNda(row.id)}
        onPreviewNda={(row) => handlePreviewNda(row.id)}
      />

      {approveId && (
        <ApproveDialog orgId={orgId} requestId={approveId} onClose={() => setApproveId(null)} />
      )}
      {denyId && <DenyDialog orgId={orgId} requestId={denyId} onClose={() => setDenyId(null)} />}
    </div>
  );
}

