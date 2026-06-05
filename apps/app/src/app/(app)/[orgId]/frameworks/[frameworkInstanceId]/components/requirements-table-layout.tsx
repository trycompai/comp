import { TableHead, TableHeader, TableRow } from '@trycompai/design-system';
import type { CSSProperties } from 'react';

interface RequirementsTableColumn {
  id: string;
  label: string;
  title?: string;
  width: string;
}

const REQUIREMENTS_TABLE_COLUMNS = [
  { id: 'identifier', label: 'Identifier', width: '10%' },
  { id: 'name', label: 'Name', width: '19%' },
  { id: 'description', label: 'Description', width: '22%' },
  { id: 'compliance', label: 'Compliance', width: '13%' },
  { id: 'status', label: 'Status', width: '11%' },
  { id: 'controls', label: 'Controls', width: '7%' },
  { id: 'policies', label: 'Policies', width: '6.5%' },
  { id: 'tasks', label: 'Tasks', width: '5.5%' },
  { id: 'documents', label: 'Docs', title: 'Documents', width: '6%' },
] as const satisfies readonly RequirementsTableColumn[];

export const REQUIREMENTS_TABLE_COLUMN_COUNT = REQUIREMENTS_TABLE_COLUMNS.length;

export const REQUIREMENTS_TABLE_STYLE: CSSProperties = {
  tableLayout: 'fixed',
};

export function RequirementsTableColumnGroup() {
  return (
    <colgroup>
      {REQUIREMENTS_TABLE_COLUMNS.map((column) => (
        <col key={column.id} style={{ width: column.width }} />
      ))}
    </colgroup>
  );
}

export function RequirementsTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        {REQUIREMENTS_TABLE_COLUMNS.map((column) => (
          <TableHead
            key={column.id}
            style={{ width: column.width }}
            title={'title' in column ? column.title : undefined}
          >
            {column.label}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}
