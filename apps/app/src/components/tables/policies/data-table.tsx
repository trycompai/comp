"use client";

import { Table, TableBody, TableCell, TableRow } from "@bubba/ui/table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Suspense } from "react";
import { cn } from "../../../../../../packages/ui/src/utils";
import { type PolicyType, columns as getColumns } from "./columns";
import { DataTableHeader } from "./data-table-header";
import { DataTablePagination } from "./data-table-pagination";
import { Loading } from "./loading";

interface DataTableProps<TData, TValue> {
  columnHeaders: {
    name: string;
    lastUpdated: string;
    status: string;
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
    data: data as PolicyType[],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
  });

  return (
    <Suspense fallback={<Loading isEmpty={false} />}>
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
                        (cell.column.id === "lastUpdated" ||
                          cell.column.id === "ownerId" ||
                          cell.column.id === "assignedTo" ||
                          cell.column.id === "published") &&
                          "hidden md:table-cell"
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No policies found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <DataTablePagination pageCount={pageCount} currentPage={currentPage} />
      </div>
    </Suspense>
  );
}
