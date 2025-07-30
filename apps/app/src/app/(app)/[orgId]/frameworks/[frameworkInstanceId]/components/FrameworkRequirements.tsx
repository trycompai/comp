'use client';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import type { FrameworkEditorRequirement } from '@db';
import { ColumnDef } from '@tanstack/react-table';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import type { FrameworkInstanceWithControls } from '../../types';

interface RequirementItem extends FrameworkEditorRequirement {
  mappedControlsCount: number;
}

export function FrameworkRequirements({
  requirementDefinitions,
  frameworkInstanceWithControls,
}: {
  requirementDefinitions: FrameworkEditorRequirement[];
  frameworkInstanceWithControls: FrameworkInstanceWithControls;
}) {
  const { orgId, frameworkInstanceId } = useParams<{
    orgId: string;
    frameworkInstanceId: string;
  }>();

  const items = useMemo(() => {
    return requirementDefinitions.map((def) => {
      const mappedControlsCount = frameworkInstanceWithControls.controls.filter(
        (control) =>
          control.requirementsMapped?.some((reqMap) => reqMap.requirementId === def.id) ?? false,
      ).length;

      return {
        ...def,
        mappedControlsCount,
      };
    });
  }, [requirementDefinitions, frameworkInstanceWithControls.controls]);

  const columns = useMemo<ColumnDef<RequirementItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title={'Name'} />,
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[300px] truncate">{row.original.name}</span>
        ),
        enableSorting: true,
        size: 200,
        minSize: 150,
        maxSize: 250,
        meta: {
          label: 'Requirement Name',
          placeholder: 'Search...',
          variant: 'text',
        },
        enableColumnFilter: true,
      },
      {
        accessorKey: 'description',
        header: ({ column }) => <DataTableColumnHeader column={column} title={'Description'} />,
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[300px] truncate">{row.original.description}</span>
        ),
        enableSorting: true,
        size: 500,
        minSize: 300,
        maxSize: 700,
        enableResizing: true,
      },
      {
        accessorKey: 'mappedControlsCount',
        header: ({ column }) => <DataTableColumnHeader column={column} title={'Controls'} />,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">{row.original.mappedControlsCount}</span>
        ),
        size: 25,
        minSize: 25,
        maxSize: 25,
        enableSorting: true,
        enableResizing: true,
      },
    ],
    [],
  );

  const table = useDataTable({
    data: items,
    columns,
    pageCount: 1,
    shallow: false,
    getRowId: (row) => row.id,
    initialState: {
      sorting: [{ id: 'name', desc: false }],
    },
  });

  if (!items?.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">
        Requirements ({table.table.getFilteredRowModel().rows.length})
      </h2>
      <DataTable
        table={table.table}
        rowClickBasePath={`/${orgId}/frameworks/${frameworkInstanceId}/requirements/`}
        getRowId={(row) => row.id}
      >
        <DataTableToolbar table={table.table}>
          {/* <DataTableSortList table={table.table} align="end" /> */}
        </DataTableToolbar>
      </DataTable>
    </div>
  );
}
