"use client";

import { useI18n } from "@/locales/client";
import type { VendorTaskStatus } from "@bubba/db/types";
import { Avatar, AvatarFallback, AvatarImage } from "@bubba/ui/avatar";
import { Badge } from "@bubba/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

export interface VendorTaskType {
  id: string;
  title: string;
  description: string;
  status: VendorTaskStatus;
  dueDate: string;
  owner: {
    name: string;
    image: string;
  };
}

export function useColumns() {
  const t = useI18n();

  const columns: ColumnDef<VendorTaskType>[] = [
    {
      accessorKey: "title",
      header: t("vendors.tasks.columns.title"),
    },
    {
      accessorKey: "description",
      header: t("vendors.tasks.columns.description"),
    },
    {
      accessorKey: "status",
      header: t("vendors.tasks.columns.status"),
      cell: ({ row }) => {
        const status = row.getValue("status") as VendorTaskStatus;
        return (
          <Badge
            variant={
              status === "completed"
                ? "secondary"
                : status === "in_progress"
                ? "outline"
                : "default"
            }
          >
            {status
              .toLowerCase()
              .split("_")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "dueDate",
      header: t("vendors.tasks.columns.due_date"),
      cell: ({ row }) => {
        const date = row.getValue("dueDate") as string;
        if (!date) return "-";
        return format(new Date(date), "PP");
      },
    },
    {
      accessorKey: "owner",
      header: t("vendors.tasks.columns.owner"),
      cell: ({ row }) => {
        const owner = row.getValue("owner") as { name: string; image: string };
        if (!owner) return "-";
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={owner.image} alt={owner.name} />
              <AvatarFallback>
                {owner.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{owner.name}</span>
          </div>
        );
      },
    },
  ];

  return columns;
} 