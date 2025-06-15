"use client";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { StatusIndicator } from "@/components/status-indicator";
import { formatDate } from "@/lib/format";
import { Policy } from "@comp/db/types";
import { ColumnDef } from "@tanstack/react-table";

export function getPolicyColumns(): ColumnDef<Policy>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Policy Name" />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <span className="max-w-[31.25rem] truncate font-medium">
              {row.getValue("name")}
            </span>
          </div>
        );
      },
      meta: {
        label: "Policy Name",
        placeholder: "Search for a policy...",
        variant: "text",
      },
      enableColumnFilter: true,
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        return <StatusIndicator status={row.original.status} />;
      },
      meta: {
        label: "Status",
        placeholder: "Search status...",
        variant: "select",
      },
    },
    {
      id: "updatedAt",
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Updated" />
      ),
      cell: ({ row }) => {
        return (
          <div className="text-muted-foreground">
            {formatDate(row.getValue("updatedAt"))}
          </div>
        );
      },
      meta: {
        label: "Last Updated",
        placeholder: "Search last updated...",
        variant: "date",
      },
    },
  ];
}
