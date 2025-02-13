"use client";

import { DataTable } from "@/components/tables/policies/data-table";
import { FilterToolbar } from "@/components/tables/policies/filter-toolbar";
import { usePolicies } from "../hooks/usePolicies";
import { useQueryState } from "nuqs";
import { Skeleton } from "@bubba/ui/skeleton";

interface PoliciesTableProps {
  columnHeaders: {
    name: string;
    lastUpdated: string;
    status: string;
  };
  users: Array<{ id: string; name: string | null }>;
}

export function PoliciesTable({ columnHeaders, users }: PoliciesTableProps) {
  const [search] = useQueryState("search");
  const [sort] = useQueryState("sort");
  const [status] = useQueryState("status", { defaultValue: "all" });
  const [page] = useQueryState("page", { defaultValue: "1" });
  const [perPage] = useQueryState("per_page", { defaultValue: "10" });

  const { data, isLoading, error } = usePolicies({
    page: Number(page),
    perPage: Number(perPage),
    search: search || undefined,
    sort: sort || undefined,
    status: status || "all",
  });

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Failed to load policies: {error.message}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[48px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const pageCount = Math.ceil(data.total / Number(perPage));

  return (
    <div className="space-y-4">
      <FilterToolbar users={users} />

      <DataTable
        data={data.items}
        columnHeaders={columnHeaders}
        pageCount={pageCount}
        currentPage={Number(page)}
      />
    </div>
  );
}
