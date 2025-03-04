"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { cn } from "@bubba/ui/cn";
import { Table, TableBody, TableCell, TableRow } from "@bubba/ui/table";
import { type RiskRegisterType, columns as getColumns } from "./columns";
import { DataTableHeader } from "./data-table-header";
import { DataTablePagination } from "./data-table-pagination";

interface DataTableProps<TData, TValue> {
  columnHeaders: {
    title: string;
    status: string;
    department: string;
    ownerId: string;
  };
  data: TData[];
  pageCount: number;
  currentPage: number;
}

export function DataTable<TData, TValue>({
  columnHeaders,
  data,
  pageCount,
  currentPage,
}: DataTableProps<TData, TValue>) {
  const clientColumns = getColumns();
  const columns = clientColumns.map((col) => ({
    ...col,
    header: columnHeaders[col.id as keyof typeof columnHeaders],
  }));

  const table = useReactTable({
    data: data as RiskRegisterType[],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
  });

  return (
    <div className="w-full overflow-auto">
      <Table>
        <DataTableHeader table={table} />

        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      (cell.column.id === "department" ||
                        cell.column.id === "ownerId" ||
                        cell.column.id === "assignedTo" ||
                        cell.column.id === "status") &&
                        "hidden md:table-cell",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <DataTablePagination pageCount={pageCount} currentPage={currentPage} />
    </div>
  );
}
