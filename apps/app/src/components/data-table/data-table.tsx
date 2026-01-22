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
  getRowProps?: (row: TData) => { disabled?: boolean; className?: string };
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
  getRowProps,
  ...props
}: DataTableProps<TData>) {
  const router = useRouter();

  const handleRowClick = (row: TData) => {
    if (onRowClick) {
      onRowClick(row);
    }
    if (getRowId && rowClickBasePath) {
      const id = getRowId(row);
      router.push(`${rowClickBasePath}/${id}`);
    }
  };

  const filteredRows = table.getFilteredRowModel().rows;
  const isRowClickable = !!(getRowId && rowClickBasePath) || !!onRowClick;

  return (
    <div className={cn('space-y-4', className)} {...props}>
      {children}
      <div className="rounded-md w-full overflow-hidden">
        <Table className="min-w-full">
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
              filteredRows.map((row) => {
                const customRowProps = getRowProps?.(row.original);
                const isDisabled = Boolean(customRowProps?.disabled);
                const rowClassName = cn(
                  isRowClickable && 'hover:bg-muted/50 cursor-pointer',
                  isDisabled && 'pointer-events-none cursor-not-allowed opacity-60',
                  customRowProps?.className,
                );

                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    aria-disabled={isDisabled || undefined}
                    className={rowClassName}
                    onClick={
                      isRowClickable && !isDisabled ? () => handleRowClick(row.original) : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell, index) => {
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            index !== 0 && 'hidden md:table-cell',
                            index === 0 && 'truncate w-[60%]',
                          )}
                          style={{
                            ...getCommonPinningStyles({
                              column: cell.column,
                            }),
                            width: index === 0 ? '60%' : undefined,
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
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
