"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { useI18n } from "@/locales/client";
import { Button } from "@bubba/ui/button";
import { cn } from "@bubba/ui/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@bubba/ui/table";
import { useRouter } from "next/navigation";
import type { TestType } from "./columns";
import { DataTableHeader } from "./data-table-header";
import { DataTablePagination } from "./data-table-pagination";

interface DataTableProps {
  columnHeaders: {
    severity: string;
    result: string;
    title: string;
    provider: string;
    createdAt: string;
    assignedUser: string;
  };
  data: TestType[];
  pageCount: number;
  currentPage: number;
}

function getColumns(): ColumnDef<TestType>[] {
  const t = useI18n();

  return [
    {
      id: "severity",
      accessorKey: "severity",
      header: ({ column }) => (
        <TableHead>
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("tests.table.severity")}
          </Button>
        </TableHead>
      ),
    },
    {
      id: "result",
      accessorKey: "result",
      header: ({ column }) => (
        <TableHead>
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("tests.table.result")}
          </Button>
        </TableHead>
      ),
    },
    {
      id: "title",
      accessorKey: "title",
      header: ({ column }) => (
        <TableHead>
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("tests.table.title")}
          </Button>
        </TableHead>
      ),
    },
    {
      id: "provider",
      accessorKey: "provider",
      header: ({ column }) => (
        <TableHead>
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("tests.table.provider")}
          </Button>
        </TableHead>
      ),
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => (
        <TableHead>
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("tests.table.createdAt")}
          </Button>
        </TableHead>
      ),
    },
    {
      id: "assignedUser",
      accessorKey: "assignedUser",
      header: ({ column }) => (
        <TableHead>
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("tests.table.assignedUser")}
          </Button>
        </TableHead>
      ),
    }
  ];
}

export function DataTable({
  columnHeaders,
  data,
  pageCount,
  currentPage,
}: DataTableProps) {
  const router = useRouter();
  const clientColumns = getColumns();
  const columns = clientColumns.map((col) => ({
    ...col,
    header: columnHeaders[col.id as keyof typeof columnHeaders],
    accessorFn: (row: TestType) => row[col.id as keyof TestType],
  }));

  const table = useReactTable({
    data,
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
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => {
                  const test = row.original;
                  router.push(`/tests/${test.id}`);
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn({
                      "hidden md:table-cell":
                        cell.column.id === "severity" ||
                        cell.column.id === "result" ||
                        cell.column.id === "title" ||
                        cell.column.id === "provider" ||
                        cell.column.id === "createdAt" ||
                        cell.column.id === "assignedUser",
                    })}
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
