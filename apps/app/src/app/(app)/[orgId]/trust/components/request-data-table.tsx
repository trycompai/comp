'use client';

import { DataTable } from '@/components/ui/data-table/DataTable';
import type { AccessRequest } from '@/hooks/use-access-requests';
import { buildRequestColumns } from './request-columns';

interface RequestDataTableProps {
  data: AccessRequest[];
  isLoading?: boolean;
  onApprove: (row: AccessRequest) => void;
  onDeny: (row: AccessRequest) => void;
  onResendNda: (row: AccessRequest) => void;
  onPreviewNda: (row: AccessRequest) => void;
}

export function RequestDataTable({
  data,
  isLoading,
  onApprove,
  onDeny,
  onResendNda,
  onPreviewNda,
}: RequestDataTableProps) {
  const columns = buildRequestColumns({
    onApprove,
    onDeny,
    onResendNda,
    onPreviewNda,
  });

  return (
    <DataTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      emptyMessage="No access requests yet"
    />
  );
}
