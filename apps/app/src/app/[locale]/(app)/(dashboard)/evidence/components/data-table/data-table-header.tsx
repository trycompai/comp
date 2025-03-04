"use client";

import type { Table } from "@tanstack/react-table";
import { TableHead, TableHeader, TableRow } from "@bubba/ui/table";
import { flexRender } from "@tanstack/react-table";
import type { EvidenceTaskRow } from "./types";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@bubba/ui/cn";

interface DataTableHeaderProps {
  table: Table<EvidenceTaskRow>;
}

export function DataTableHeader({ table }: DataTableHeaderProps) {
  return (
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <TableHead
              key={header.id}
              className="p-4 relative whitespace-nowrap"
              style={{ width: header.getSize() }}
            >
              {header.isPlaceholder ? null : (
                <div
                  className={cn(
                    "flex items-center overflow-hidden",
                    header.column.getCanSort() && "cursor-pointer select-none",
                  )}
                  style={{ width: header.getSize() - 32 }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
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
                className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none bg-border opacity-0 hover:opacity-100 ${
                  table.getState().columnSizingInfo.isResizingColumn ===
                  header.column.id
                    ? "bg-primary opacity-100"
                    : ""
                }`}
              />
            </TableHead>
          ))}
        </TableRow>
      ))}
    </TableHeader>
  );
}
