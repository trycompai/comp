'use client';

import { cn } from '@comp/ui/cn';
import { TableHead, TableHeader, TableRow } from '@comp/ui/table';
import type { Table } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

interface DataTableHeaderProps<TData> {
  table: Table<TData>;
}

export function DataTableHeader<TData>({ table }: DataTableHeaderProps<TData>) {
  return (
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <TableHead
              key={header.id}
              className="relative px-3 py-2 whitespace-nowrap text-sm"
              style={{ width: header.getSize() }}
            >
              {header.isPlaceholder ? null : (
                <div
                  className={cn(
                    'flex items-center overflow-hidden',
                    header.column.getCanSort() && 'cursor-pointer select-none',
                  )}
                  style={{ width: header.getSize() - 32 }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{
                    asc: <ArrowUp className="ml-2 h-4 w-4" />,
                    desc: <ArrowDown className="ml-2 h-4 w-4" />,
                  }[header.column.getIsSorted() as string] ??
                    (header.column.getCanSort() && (
                      <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                    ))}
                </div>
              )}
              <div
                onMouseDown={header.getResizeHandler()}
                onTouchStart={header.getResizeHandler()}
                className={`bg-border absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none opacity-0 select-none hover:opacity-100 ${
                  table.getState().columnSizingInfo.isResizingColumn === header.column.id
                    ? 'bg-primary opacity-100'
                    : ''
                }`}
              />
            </TableHead>
          ))}
        </TableRow>
      ))}
    </TableHeader>
  );
}
