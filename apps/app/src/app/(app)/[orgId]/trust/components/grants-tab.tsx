import { useAccessGrants } from '@/hooks/use-access-requests';
import { Input } from '@comp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { useState } from 'react';
import { GrantDataTable } from './grant-data-table';
import { RevokeDialog } from './revoke-dialog';

export function GrantsTab({ orgId }: { orgId: string }) {
  const { data, isLoading } = useAccessGrants(orgId);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | 'all'>('all');

  const filtered = (data ?? []).filter((grant) => {
    const matchesSearch =
      !search || grant.subjectEmail.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = status === 'all' || grant.status === status;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Search by email"
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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <GrantDataTable
        data={filtered}
        isLoading={isLoading}
        onRevoke={(row) => setRevokeId(row.id)}
      />

      {revokeId && (
        <RevokeDialog orgId={orgId} grantId={revokeId} onClose={() => setRevokeId(null)} />
      )}
    </div>
  );
}

