'use client';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { useGT } from 'gt-next';
import { useParams } from 'next/navigation';
import * as React from 'react';
import { CreateVendorSheet } from '../../components/create-vendor-sheet';
import type { GetAssigneesResult, GetVendorsResult } from '../data/queries';
import { getColumns } from './VendorColumns'; // This requires a t function to be passed into it

interface VendorsTableProps {
  promises: Promise<[GetVendorsResult, GetAssigneesResult]>;
}

export function VendorsTable({ promises }: VendorsTableProps) {
  const { orgId } = useParams();
  const t = useGT();

  // Resolve the promise data here
  const [{ data: vendors, pageCount }, assignees] = React.use(promises);

  // Define columns memoized
  const memoizedColumns = React.useMemo(() => getColumns(t), [t]);

  const { table } = useDataTable({
    data: vendors,
    columns: memoizedColumns,
    pageCount: pageCount,
    getRowId: (row) => row.id,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 50,
      },
      sorting: [{ id: 'name', desc: true }],
    },
    shallow: false,
    clearOnDefault: true,
  });

  return (
    <>
      <DataTable table={table} getRowId={(row) => row.id} rowClickBasePath={`/${orgId}/vendors`}>
        <DataTableToolbar table={table} sheet="createVendorSheet" action={t('Add Vendor')} />
      </DataTable>
      <CreateVendorSheet assignees={assignees} />
    </>
  );
}
