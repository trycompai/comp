"use client";
import { AssignedUser } from "@/components/assigned-user";
import { Status, type StatusType } from "@/components/status";
import { useI18n } from "@/locales/client";
import type { Departments, RiskStatus } from "@bubba/db";
import { Badge } from "@bubba/ui/badge";
import { Button } from "@bubba/ui/button";
import { cn } from "@bubba/ui/cn";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export type RiskRegisterType = {
  id: string;
  title: string;
  status: RiskStatus;
  department?: Departments;
  ownerId: string;
  owner: {
    image: string;
    name: string;
  };
};

export function columns(): ColumnDef<RiskRegisterType>[] {
  const t = useI18n();

  return [
    {
      id: "name",
      accessorKey: "name",
      header: t("risk.register.table.risk"),
      cell: ({ row }) => {
        const status = row.original.status;

        return (
          <div className="flex flex-col gap-1">
            <Button variant="link" className="p-0 justify-start" asChild>
              <Link href={`/risk/${row.original.id}`}>
                <span className="truncate">{row.original.title}</span>
              </Link>
            </Button>
            <div className="md:hidden">
              <Status status={status.toLowerCase() as StatusType} />
            </div>
          </div>
        );
      },
    },
    {
      id: "status",
      accessorKey: "status",
      header: () => (
        <span className="hidden md:table-cell">{t("common.table.status")}</span>
      ),
      cell: ({ row }) => {
        const status = row.original.status;

        return (
          <div className="hidden md:flex items-center gap-2">
            <Status status={status.toLowerCase() as StatusType} />
          </div>
        );
      },
    },
    {
      id: "department",
      accessorKey: "department",
      header: () => (
        <span className="hidden md:table-cell">
          {t("common.filters.department")}
        </span>
      ),
      cell: ({ row }) => {
        const department = row.original.department;

        if (!department) {
          return <span className="hidden md:table-cell">—</span>;
        }

        return (
          <span className="hidden md:table-cell">
            <Badge variant="marketing">
              {department.replace(/_/g, " ").toUpperCase()}
            </Badge>
          </span>
        );
      },
    },
    {
      id: "ownerId",
      accessorKey: "ownerId",
      header: () => (
        <span className="hidden md:table-cell">
          {t("common.assignee.label")}
        </span>
      ),
      cell: ({ row }) => {
        return (
          <div className="hidden md:table-cell">
            <AssignedUser
              fullName={row.original.owner?.name}
              avatarUrl={row.original.owner?.image}
            />
          </div>
        );
      },
    },
  ];
}
