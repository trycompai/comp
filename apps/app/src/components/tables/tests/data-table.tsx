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
import type { PersonType } from "./columns";
import { DataTableHeader } from "./data-table-header";
import { DataTablePagination } from "./data-table-pagination";

interface DataTableProps {
  columnHeaders: {
    name: string;
    email: string;
    department: string;
  };
  data: PersonType[];
  pageCount: number;
  currentPage: number;
}

function getColumns(): ColumnDef<PersonType>[] {
  const t = useI18n();

  return [
    {
      id: "email",
      accessorKey: "email",
      header: ({ column }) => (
        <TableHead>
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("people.table.email")}
          </Button>
        </TableHead>
      ),
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <TableHead>
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("people.table.name")}
          </Button>
        </TableHead>
      ),
    },
    {
      id: "department",
      accessorKey: "department",
      header: ({ column }) => (
        <TableHead>
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("people.table.department")}
          </Button>
        </TableHead>
      ),
    },
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
    accessorFn: (row: PersonType) => row[col.id as keyof PersonType],
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
                  const person = row.original;
                  router.push(`/people/${person.id}`);
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn({
                      "hidden md:table-cell":
                        cell.column.id === "email" ||
                        cell.column.id === "department",
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
