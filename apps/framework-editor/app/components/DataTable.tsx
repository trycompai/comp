'use client';

import { Button } from '@comp/ui/button';
import { Input } from '@comp/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@comp/ui/table';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { PlusCircle, Search, TableIcon } from 'lucide-react';
import { useQueryState } from 'nuqs';
import React, { useMemo, type ElementType } from 'react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchQueryParamName?: string;
  onCreateClick?: () => void;
  createButtonLabel?: string;
  CreateButtonIcon?: ElementType;
  onRowClick?: (rowData: TData) => void;
  searchPlaceholder?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchQueryParamName = 'q',
  onCreateClick,
  createButtonLabel = 'Create New',
  CreateButtonIcon = PlusCircle,
  onRowClick,
  searchPlaceholder = 'Search table...',
}: DataTableProps<TData, TValue>) {
  const [globalFilter, setGlobalFilter] = useQueryState(searchQueryParamName, {
    defaultValue: '',
  });
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter: globalFilter ?? '',
      sorting,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
  });

  const searchTerm = globalFilter ?? '';
  const { rows } = table.getRowModel();

  // Memoize filtered data for "No results" message logic
  const hasFilteredResults = useMemo(() => {
    if (!searchTerm) return data.length > 0;
    if (!data) return false;

    return data.some((item) =>
      columns.some((colDef) => {
        const column = colDef as any;
        let cellValueString = '';
        if (typeof column.accessorFn === 'function') {
          const cellValue = column.accessorFn(item, 0);
          cellValueString = String(cellValue);
        } else if (column.accessorKey) {
          cellValueString = String(item[column.accessorKey as keyof TData]);
        }
        return cellValueString.toLowerCase().includes(searchTerm.toLowerCase());
      }),
    );
  }, [data, searchTerm, columns]);

  if (!data || (data.length === 0 && !searchTerm)) {
    return (
      <div
        className="bg-card flex flex-col items-center justify-center space-y-4 rounded-sm p-4 py-16 text-center"
        id="no-data-available"
      >
        <div className="bg-muted mx-auto flex h-12 w-12 items-center justify-center rounded-full p-3">
          <TableIcon className="text-muted-foreground h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-medium">No data available</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Get started by creating your first entry.
          </p>
        </div>
        {onCreateClick && (
          <Button onClick={onCreateClick} variant="outline">
            <CreateButtonIcon className="mr-2 h-4 w-4" />
            {createButtonLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setGlobalFilter(e.target.value || null)}
          className="w-full"
          leftIcon={<Search className="text-muted-foreground h-4 w-4" />}
        />
        {onCreateClick && (
          <Button variant="outline" className="ml-auto" onClick={onCreateClick}>
            <CreateButtonIcon className="mr-2 h-4 w-4" />
            {createButtonLabel}
          </Button>
        )}
      </div>
      {rows.length > 0 ? (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{ width: header.getSize() }}
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
            {rows.map((row) => {
              return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onRowClick && onRowClick(row.original as TData)}
                  className={`group ${onRowClick ? 'hover:bg-muted/50 cursor-pointer' : ''}`.trim()}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : searchTerm && !hasFilteredResults && data.length > 0 ? (
        <p className="py-4 text-center">No results found for "{searchTerm}".</p>
      ) : (
        !searchTerm && data.length === 0 && <p className="py-4 text-center">No data available.</p>
      )}
    </div>
  );
}
