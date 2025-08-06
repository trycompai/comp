'use client';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import type { ApiKey } from '@/hooks/use-api-keys';
import { useDataTable } from '@/hooks/use-data-table';
import { Button } from '@comp/ui/button';
import { T, useGT } from 'gt-next';
import { Plus } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { CreateApiKeyDialog } from '../CreateApiKeyDialog';
import { columns as getColumns } from './ApiKeysColumns';

export function ApiKeysTable({ apiKeys }: { apiKeys: ApiKey[] }) {
  const t = useGT();
  const columns = useMemo(() => getColumns(t), [t]);
  const { table } = useDataTable({
    data: apiKeys,
    columns,
    pageCount: 1,
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
  const [openSheet, setOpenSheet] = useQueryState('create-api-key-sheet');
  return (
    <>
      <DataTable table={table}>
        <DataTableToolbar table={table}>
          <Button
            className="flex items-center gap-1 rounded-sm"
            onClick={() => setOpenSheet('true')}
          >
            <Plus className="h-4 w-4" />
            <T>Add API Key</T>
          </Button>
        </DataTableToolbar>
      </DataTable>
      <CreateApiKeyDialog
        open={Boolean(openSheet)}
        onOpenChange={(open) => setOpenSheet(open ? 'true' : null)}
      />
    </>
  );
}
