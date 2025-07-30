'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@comp/ui/table';
import type { Task } from '@db';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useGetColumnHeaders } from './client-columns';

interface DataTableProps {
  data: Task[];
  pageCount: number;
  currentPage: number;
}

export function DataTable({ data, pageCount, currentPage }: DataTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const columnHeaders = useGetColumnHeaders();

  const table = useReactTable({
    data,
    columns: columnHeaders,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
  });

  function onPageChange(page: number) {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-sm border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnHeaders.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* <DataTablePagination
        pageCount={pageCount}
        currentPage={currentPage}
        onPageChange={onPageChange}
      /> */}
    </div>
  );
}
