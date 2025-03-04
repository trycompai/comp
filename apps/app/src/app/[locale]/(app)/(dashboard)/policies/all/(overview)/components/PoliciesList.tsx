"use client";

import type { PolicyType } from "@/components/tables/policies/columns";
import { DataTable } from "@/components/tables/policies/data-table";
import {
  NoPolicies,
  NoResults,
} from "@/components/tables/policies/empty-states";
import { FilterToolbar } from "@/components/tables/policies/filter-toolbar";
import { Loading } from "@/components/tables/policies/loading";
import { useI18n } from "@/locales/client";
import { Alert, AlertDescription, AlertTitle } from "@bubba/ui/alert";
import { Button } from "@bubba/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePolicies } from "../hooks/usePolicies";
import { PoliciesListSkeleton } from "./PoliciesListSkeleton";
import type { User } from "next-auth";

interface PoliciesListProps {
  columnHeaders: {
    name: string;
    status: string;
    updatedAt: string;
  };
  users: User[];
}

export function PoliciesList({ columnHeaders, users }: PoliciesListProps) {
  const t = useI18n();
  const searchParams = useSearchParams();
  const search = searchParams.get("search");
  const status = searchParams.get("status");
  const sort = searchParams.get("sort");
  const per_page = Number(searchParams.get("per_page")) || 10;
  const page = Number(searchParams.get("page")) || 1;

  const { policies, total, isLoading, error } = usePolicies();

  if (isLoading) {
    return <PoliciesListSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 flex items-center gap-3">
            <AlertTriangle className="text-red-500 h-5 w-5" />
            <span>{error.message || t("common.errors.unexpected_error")}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasFilters = !!(search || status || sort);

  if (policies.length === 0 && !hasFilters) {
    return (
      <div className="relative overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t("policies.title")}</h1>
          <Link href="/policies/new">
            <Button>{t("policies.create_new")}</Button>
          </Link>
        </div>
        <FilterToolbar isEmpty={true} users={users} />
        <NoPolicies />
        <Loading isEmpty />
      </div>
    );
  }

  return (
    <div className="relative">
      <FilterToolbar
        isEmpty={policies.length === 0 && !hasFilters}
        users={users}
      />

      {policies.length > 0 ? (
        <DataTable
          columnHeaders={columnHeaders}
          data={policies as unknown as PolicyType[]}
          pageCount={Math.ceil(total / per_page)}
          currentPage={page}
        />
      ) : (
        <NoResults hasFilters={hasFilters} />
      )}
    </div>
  );
}
