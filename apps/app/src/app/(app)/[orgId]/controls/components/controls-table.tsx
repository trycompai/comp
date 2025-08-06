'use client';

import * as React from 'react';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { CreatePolicySheet } from '@/components/sheets/create-policy-sheet';
import { useDataTable } from '@/hooks/use-data-table';
import { useGT } from 'gt-next';
import { useParams } from 'next/navigation';
import { ControlWithRelations } from '../data/queries';
import { getGetControlColumns } from './controls-table-columns';

interface ControlsTableProps {
  promises: Promise<[{ data: ControlWithRelations[]; pageCount: number }]>;
}

export function ControlsTable({ promises }: ControlsTableProps) {
  const [{ data, pageCount }] = React.use(promises);
  const { orgId } = useParams();
  const t = useGT();
  const columns = React.useMemo(() => getGetControlColumns(t), [t]);
  const [filteredData, setFilteredData] = React.useState<ControlWithRelations[]>(data);

  // For client-side filtering, we don't need to apply server-side filtering
  const { table } = useDataTable({
    data: filteredData,
    columns,
    pageCount,
    initialState: {
      sorting: [{ id: 'name', desc: true }],
    },
    getRowId: (row) => row.id,
    shallow: false,
    clearOnDefault: true,
  });

  return (
    <>
      <DataTable table={table} getRowId={(row) => row.id} rowClickBasePath={`/${orgId}/controls`}>
        <DataTableToolbar table={table} />
      </DataTable>
      <CreatePolicySheet />
    </>
  );
}
