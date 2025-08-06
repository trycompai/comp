'use client';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { Button } from '@comp/ui/button';
import type { Context } from '@prisma/client';
import { T, useGT } from 'gt-next';
import { Plus } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { CreateContextSheet } from './components/CreateContextSheet';
import { columns as getColumns } from './components/table/ContextColumns'; // This requires a t function to be passed into it

export const ContextTable = ({ entries, pageCount }: { entries: Context[]; pageCount: number }) => {
  const t = useGT();
  const columns = useMemo(() => getColumns(t), [t]);
  const { table } = useDataTable({
    data: entries,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    initialState: {
      pagination: {
        pageSize: 50,
        pageIndex: 0,
      },
      sorting: [{ id: 'createdAt', desc: true }],
    },
    shallow: false,
    clearOnDefault: true,
  });
  const [_, setOpenSheet] = useQueryState('create-context-sheet');
  return (
    <>
      <DataTable table={table}>
        <DataTableToolbar table={table}>
          <Button
            className="flex items-center gap-1 rounded-sm"
            onClick={() => setOpenSheet('true')}
          >
            <Plus className="h-4 w-4" />
            <T>Add Entry</T>
          </Button>
        </DataTableToolbar>
      </DataTable>
      <CreateContextSheet />
    </>
  );
};
