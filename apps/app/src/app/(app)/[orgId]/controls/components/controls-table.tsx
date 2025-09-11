'use client';

import * as React from 'react';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { useParams } from 'next/navigation';
import { ControlWithRelations } from '../data/queries';
import { getControlColumns } from './controls-table-columns';
import { CreateControlSheet } from './CreateControlSheet';

interface ControlsTableProps {
  promises: Promise<[{ data: ControlWithRelations[]; pageCount: number }]>;
  policies: { id: string; name: string }[];
  tasks: { id: string; title: string }[];
  requirements: {
    id: string;
    name: string;
    identifier: string;
    frameworkInstanceId: string;
    frameworkName: string;
  }[];
}

export function ControlsTable({ promises, policies, tasks, requirements }: ControlsTableProps) {
  const [{ data, pageCount }] = React.use(promises);
  const { orgId } = useParams();
  const columns = React.useMemo(() => getControlColumns(), []);
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
        <DataTableToolbar table={table} sheet="create-control" action="Create Control" />
      </DataTable>
      <CreateControlSheet policies={policies} tasks={tasks} requirements={requirements} />
    </>
  );
}
