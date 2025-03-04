"use client";

import { StatusPolicies, type StatusType } from "@/components/status-policies";
import { formatDate } from "@/utils/format";
import { Button } from "@bubba/ui/button";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export type PolicyType = {
  id: string;
  policy: {
    id: string;
    name: string;
    description: string | null;
    slug: string;
  };
  status: "draft" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
};

export function columns(): ColumnDef<PolicyType>[] {
  return [
    {
      id: "name",
      accessorKey: "policy.name",
      cell: ({ row }) => {
        const name = row.original.policy.name;
        const id = row.original.id;
        const status = row.original.status;

        return (
          <div className="flex flex-col gap-1">
            <Button variant="link" className="p-0 justify-start" asChild>
              <Link href={`/policies/all/${id}`}>
                <span className="truncate">{name}</span>
              </Link>
            </Button>
            <div className="md:hidden">
              <StatusPolicies status={status as StatusType} />
            </div>
          </div>
        );
      },
    },
    {
      id: "status",
      accessorKey: "status",
      cell: ({ row }) => {
        const status = row.original.status;

        return (
          <div className="hidden md:flex items-center gap-2">
            <StatusPolicies status={status as StatusType} />
          </div>
        );
      },
    },
    {
      id: "updatedAt",
      accessorKey: "updatedAt",
      cell: ({ row }) => {
        const date = row.original.updatedAt;

        return (
          <div className="text-muted-foreground">
            {formatDate(date, "MMM d, yyyy")}
          </div>
        );
      },
    },
  ];
}
