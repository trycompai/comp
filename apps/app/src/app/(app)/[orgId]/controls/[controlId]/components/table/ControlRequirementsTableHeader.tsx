'use client';

import { TableHead, TableHeader, TableRow } from '@comp/ui/table';
import type { Table } from '@tanstack/react-table';
import { useGT } from 'gt-next';
import type { RequirementTableData } from './ControlRequirementsTable';

type Props = {
  table: Table<RequirementTableData>;
  loading?: boolean;
};

export function ControlRequirementsTableHeader({ table, loading }: Props) {
  const t = useGT();
  const isVisible = (id: string) =>
    loading ||
    table
      .getAllLeafColumns()
      .find((col) => col.id === id)
      ?.getIsVisible();

  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        {isVisible('type') && (
          <TableHead className="h-11 px-4 text-left align-middle font-medium">
            {t('Type')}
          </TableHead>
        )}
        {isVisible('description') && (
          <TableHead className="h-11 px-4 text-left align-middle font-medium">
            {t('Description')}
          </TableHead>
        )}
        {isVisible('status') && (
          <TableHead className="h-11 px-4 text-left align-middle font-medium">
            {t('Status')}
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
}
