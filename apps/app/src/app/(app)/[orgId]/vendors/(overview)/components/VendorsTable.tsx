'use client';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableSortList } from '@/components/data-table/data-table-sort-list';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import type { Member, User, Vendor } from '@comp/db/types';
import { useParams } from 'next/navigation';
import * as React from 'react';
import { CreateVendorSheet } from '../../components/create-vendor-sheet';
import type { GetAssigneesResult, GetVendorsResult } from '../data/queries';
import { columns } from './VendorColumns';

interface VendorsTableProps {
  promises: Promise<[GetVendorsResult, GetAssigneesResult]>;
}

export function VendorsTable({ promises }: VendorsTableProps) {
  const { orgId } = useParams();

  // Resolve the promise data here
  const [{ data: vendors, pageCount }, assignees] = React.use(promises);

  // Define columns memoized
  const memoizedColumns = React.useMemo(() => columns, [orgId]);

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
        <DataTableToolbar table={table} sheet="createVendorSheet" action="Add Vendor" />
      </DataTable>
      <CreateVendorSheet assignees={assignees} />
    </>
  );
}
