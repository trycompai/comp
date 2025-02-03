"use client";

import { Loading } from "@/components/tables/risk-tasks/loading";
import { useI18n } from "@/locales/client";
import { Table, TableBody, TableCell, TableRow } from "@bubba/ui/table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { User } from "next-auth";
import { Suspense } from "react";
import { cn } from "../../../../../../packages/ui/src/utils";
import { type MemberType, columns as getColumns } from "./columns";

interface DataTableProps {
  data: MemberType[];
  currentUser: User;
}

export function DataTable({ data, currentUser }: DataTableProps) {
  const columns = getColumns();
  const t = useI18n();

  const table = useReactTable({
    data: data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      currentUser,
    },
  });

  return (
    <Suspense fallback={<Loading isEmpty={false} />}>
      <div className="w-full overflow-auto">
        <Table>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-transparent"
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn("border-r-[0px] py-4")}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
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
                  {t("roles.no_members")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Suspense>
  );
}
