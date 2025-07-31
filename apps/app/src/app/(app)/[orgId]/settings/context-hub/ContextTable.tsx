'use client';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { Button } from '@comp/ui/button';
import type { Context } from '@db';
import { Plus } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { CreateContextSheet } from './components/CreateContextSheet';
import { columns as getColumns } from './components/table/ContextColumns';

export const ContextTable = ({ entries, pageCount }: { entries: Context[]; pageCount: number }) => {
  const columns = useMemo(() => getColumns(), []);
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
            Add Entry
          </Button>
        </DataTableToolbar>
      </DataTable>
      <CreateContextSheet />
    </>
  );
};
