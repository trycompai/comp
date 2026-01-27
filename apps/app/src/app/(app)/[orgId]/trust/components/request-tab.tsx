import { useAccessRequests, usePreviewNda, useResendNda } from '@/hooks/use-access-requests';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Stack,
} from '@trycompai/design-system';
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

  const statusOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'under_review', label: 'Under review' },
    { value: 'approved', label: 'Approved' },
    { value: 'denied', label: 'Denied' },
  ];

  const selectedStatusLabel = statusOptions.find((opt) => opt.value === status)?.label ?? 'Filter status';

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
    <Stack gap="4">
      <Stack direction="row" gap="2" align="center">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search by name, email, or company"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-[200px]">
          <Select value={status} onValueChange={(value) => setStatus(value as string)}>
            <SelectTrigger>
              {selectedStatusLabel}
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Stack>

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
    </Stack>
  );
}
