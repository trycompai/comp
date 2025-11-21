'use client';

import { DataTable } from '@/components/ui/data-table/DataTable';
import type { AccessGrant } from '@/hooks/use-access-requests';
import { buildGrantColumns } from './grant-columns';

interface GrantDataTableProps {
  data: AccessGrant[];
  isLoading?: boolean;
  onRevoke: (row: AccessGrant) => void;
}

export function GrantDataTable({ data, isLoading, onRevoke }: GrantDataTableProps) {
  const columns = buildGrantColumns({ onRevoke });

  return (
    <DataTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      emptyMessage="No access grants yet"
    />
  );
}
