"use client";

import { DataTable } from "@/components/tables/tests/data-table";
import {
  NoResults,
  NoTests,
} from "@/components/tables/tests/empty-states";
import { FilterToolbar } from "@/components/tables/tests/filter-toolbar";
import { Loading } from "@/components/tables/tests/loading";
import { useTests } from "../hooks/useTests";
import { useSearchParams } from "next/navigation";
import type { TestType } from "@/components/tables/tests/columns";
import { TestsListSkeleton } from "./TestsListSkeleton";

interface TestsListProps {
  columnHeaders: {
    severity: string;
    result: string;
    title: string;
    provider: string;
    createdAt: string;
    assignedUser: string;
  };
}

export function TestsList({ columnHeaders }: TestsListProps) {
  const searchParams = useSearchParams();
  const search = searchParams.get("search");
  const provider = searchParams.get("provider");
  const status = searchParams.get("status");
  const per_page = Number(searchParams.get("per_page")) || 10;
  const page = Number(searchParams.get("page")) || 1;

  const { tests, total, isLoading, error } = useTests();

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

  const hasFilters = !!(search || provider || status);

  if (tests.length === 0 && !hasFilters) {
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
      <FilterToolbar isEmpty={tests.length === 0} />
      {tests.length > 0 ? (
        <DataTable
          columnHeaders={columnHeaders}
          data={tests as TestType[]}
          pageCount={Math.ceil(total / per_page)}
          currentPage={page}
        />
      ) : (
        <NoResults hasFilters={hasFilters} />
      )}
    </div>
  );
} 