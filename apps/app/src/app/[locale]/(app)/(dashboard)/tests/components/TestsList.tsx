"use client";

import { DataTable } from "@/components/tables/people/data-table";
import {
  NoResults,
  NoTests,
} from "@/components/tables/tests/empty-states";
import { FilterToolbar } from "@/components/tables/tests/filter-toolbar";
import { Loading } from "@/components/tables/tests/loading";
import { useEmployees } from "../../people/hooks/useEmployees";
import { useSearchParams } from "next/navigation";
import type { PersonType } from "@/components/tables/tests/columns";
import { TestsListSkeleton } from "./TestsListSkeleton";

interface TestsListProps {
  columnHeaders: {
    name: string;
    email: string;
    department: string;
  };
}

export function TestsList({ columnHeaders }: TestsListProps) {
  const searchParams = useSearchParams();
  const search = searchParams.get("search");
  const role = searchParams.get("role");
  const per_page = Number(searchParams.get("per_page")) || 10;
  const page = Number(searchParams.get("page")) || 1;

  const { employees, total, isLoading, error } = useEmployees();

  if (isLoading) {
    return <TestsListSkeleton />;
  }

  if (error) {
    return (
      <div className="relative">
        <FilterToolbar isEmpty={true} />
        <NoResults hasFilters={false} />
      </div>
    );
  }

  const hasFilters = !!(search || role);

  if (employees.length === 0 && !hasFilters) {
    return (
      <div className="relative overflow-hidden">
        <FilterToolbar isEmpty={true} />
        <NoTests />
        <Loading isEmpty />
      </div>
    );
  }

  return (
    <div className="relative">
      <FilterToolbar isEmpty={employees.length === 0} />
      {employees.length > 0 ? (
        <DataTable
          columnHeaders={columnHeaders}
          data={employees as PersonType[]}
          pageCount={Math.ceil(total / per_page)}
          currentPage={page}
        />
      ) : (
        <NoResults hasFilters={hasFilters} />
      )}
    </div>
  );
}
