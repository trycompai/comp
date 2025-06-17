import { type Table as TanstackTable, flexRender } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import type * as React from 'react';

import { getCommonPinningStyles } from '@/lib/data-table';
import { cn } from '@comp/ui/cn';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@comp/ui/table';
import { DataTablePagination } from './data-table-pagination';

interface DataTableProps<TData> extends React.ComponentProps<'div'> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
  getRowId?: (row: TData) => string;
  rowClickBasePath?: string;
  tableId?: string;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  className,
  getRowId,
  rowClickBasePath,
  tableId,
  onRowClick,
  ...props
}: DataTableProps<TData>) {
  const router = useRouter();

  const handleRowClick = (row: TData) => {
    if (onRowClick) {
      onRowClick(row);
    }
    if (getRowId) {
      const id = getRowId(row);
      router.push(`${rowClickBasePath}/${id}`);
    }
  };

  // Apply client-side filtering
  const filteredRows = table.getFilteredRowModel().rows;

  return (
    <div className={cn('space-y-4', className)} {...props}>
      {children}
      <div className="rounded-md">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      index !== 0 && 'hidden md:table-cell',
                      index === 0 && 'w-full md:w-auto',
                    )}
                    style={{
                      ...getCommonPinningStyles({
                        column: header.column,
                      }),
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {filteredRows.length ? (
              filteredRows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn((getRowId || onRowClick) && 'hover:bg-muted/50 cursor-pointer')}
                  onClick={() => handleRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell, index) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        index !== 0 && 'hidden md:table-cell',
                        index === 0 && 'truncate',
                      )}
                      style={{
                        ...getCommonPinningStyles({
                          column: cell.column,
                        }),
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="text-muted-foreground h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-4">
        <DataTablePagination table={table} tableId={tableId} />
        {actionBar && table.getFilteredSelectedRowModel().rows.length > 0 && actionBar}
      </div>
    </div>
  );
}
