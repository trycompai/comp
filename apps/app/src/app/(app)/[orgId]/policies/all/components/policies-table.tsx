'use client';

import * as React from 'react';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { CreatePolicySheet } from '@/components/sheets/create-policy-sheet';
import { useDataTable } from '@/hooks/use-data-table';
import { useGT } from 'gt-next';
import { useParams } from 'next/navigation';
import { getPolicies } from '../data/queries';
import { getGetPolicyColumns } from './policies-table-columns';

interface PoliciesTableProps {
  promises: Promise<[Awaited<ReturnType<typeof getPolicies>>]>;
}

export function PoliciesTable({ promises }: PoliciesTableProps) {
  const [{ data, pageCount }] = React.use(promises);
  const { orgId } = useParams();

  const t = useGT();
  const columns = React.useMemo(() => getGetPolicyColumns(t), [t]);

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    initialState: {
      columnPinning: { right: ['actions'] },
    },
    getRowId: (originalRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
  });

  return (
    <>
      <DataTable table={table} getRowId={(row) => row.id} rowClickBasePath={`/${orgId}/policies`}>
        <DataTableToolbar table={table} sheet="create-policy-sheet" action={t('Create Policy')}>
          {/* <DataTableSortList table={table} align="end" /> */}
        </DataTableToolbar>
      </DataTable>
      <CreatePolicySheet />
    </>
  );
}
