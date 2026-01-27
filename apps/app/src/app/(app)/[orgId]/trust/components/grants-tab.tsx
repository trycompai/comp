import { useAccessGrants, useResendAccessEmail } from '@/hooks/use-access-requests';
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
import { GrantDataTable } from './grant-data-table';
import { RevokeDialog } from './revoke-dialog';

export function GrantsTab({ orgId }: { orgId: string }) {
  const { data, isLoading } = useAccessGrants(orgId);
  const { mutateAsync: resendAccessEmail } = useResendAccessEmail(orgId);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | 'all'>('all');

  const statusOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'active', label: 'Active' },
    { value: 'revoked', label: 'Revoked' },
    { value: 'expired', label: 'Expired' },
  ];

  const selectedStatusLabel = statusOptions.find((opt) => opt.value === status)?.label ?? 'Filter status';

  const handleResendAccess = (grantId: string) => {
    toast.promise(resendAccessEmail(grantId), {
      loading: 'Resending...',
      success: 'Access email resent',
      error: 'Failed to resend access email',
    });
  };

  const filtered = (data ?? []).filter((grant) => {
    const matchesSearch =
      !search || grant.subjectEmail.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = status === 'all' || grant.status === status;
    return matchesSearch && matchesStatus;
  });

  return (
    <Stack gap="4">
      <Stack direction="row" gap="2" align="center">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search by email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-[200px]">
          <Select value={status} onValueChange={(value) => setStatus(value ?? 'all')}>
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

      <GrantDataTable
        data={filtered}
        isLoading={isLoading}
        onRevoke={(row) => setRevokeId(row.id)}
        onResendAccess={(row) => handleResendAccess(row.id)}
      />

      {revokeId && (
        <RevokeDialog orgId={orgId} grantId={revokeId} onClose={() => setRevokeId(null)} />
      )}
    </Stack>
  );
}

