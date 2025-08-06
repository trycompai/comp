'use client';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { CreateRiskSheet } from '@/components/sheets/create-risk-sheet';
import { useDataTable } from '@/hooks/use-data-table';
import { useSession } from '@/utils/auth-client';
import type { Member, Risk, User } from '@db';
import { ColumnDef } from '@tanstack/react-table';
import { useGT } from 'gt-next';
import { useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { columns as getColumns } from './components/table/RiskColumns';

export type RiskRow = Risk & { assignee: User | null };

export const RisksTable = ({
  risks,
  assignees,
  pageCount,
}: {
  risks: RiskRow[];
  assignees: (Member & { user: User })[];
  pageCount: number;
}) => {
  const session = useSession();
  const orgId = session?.data?.session?.activeOrganizationId;
  const [_, setOpenSheet] = useQueryState('create-risk-sheet');
  const t = useGT();

  const columns = useMemo<ColumnDef<RiskRow>[]>(() => getColumns(orgId ?? '', t), [orgId, t]);

  const { table } = useDataTable({
    data: risks,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    initialState: {
      pagination: {
        pageSize: 50,
        pageIndex: 0,
      },
      sorting: [{ id: 'title', desc: true }],
      columnPinning: { right: ['actions'] },
    },
    shallow: false,
    clearOnDefault: true,
  });

  return (
    <>
      <DataTable table={table} getRowId={(row) => row.id} rowClickBasePath={`/${orgId}/risk`}>
        <DataTableToolbar table={table} sheet="create-risk-sheet" action={t('Create Risk')} />
      </DataTable>
      <CreateRiskSheet assignees={assignees} />
    </>
  );
};
