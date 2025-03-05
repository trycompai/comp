"use client";

import React from "react";
import { Table, TableHead, TableHeader, TableRow } from "@bubba/ui/table";
import { flexRender, type Table as TableType } from "@tanstack/react-table";
import { TestType } from "./columns";

interface DataTableHeaderProps {
  table: TableType<TestType>;
}

export function DataTableHeader({ table }: DataTableHeaderProps) {
  return (
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <TableHead key={header.id}>
              {header.isPlaceholder
                ? null
                : flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
            </TableHead>
          ))}
        </TableRow>
      ))}
    </TableHeader>
  );
}
