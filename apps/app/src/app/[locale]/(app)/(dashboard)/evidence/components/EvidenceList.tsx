"use client";

import { useI18n } from "@/locales/client";
import { useEvidenceTable } from "../hooks/useEvidenceTableContext";
import { DataTable } from "./data-table/EvidenceListTable";
import {
  ActiveFilterBadges,
  FilterDropdown,
  PaginationControls,
  SearchInput,
} from "./EvidenceFilters";
import { SkeletonTable } from "./SkeletonTable";
import { EvidenceSummaryCards } from "./EvidenceSummaryCards";

export function EvidenceList() {
  const t = useI18n();
  const { evidenceTasks = [], isLoading, error } = useEvidenceTable();

  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <EvidenceSummaryCards />

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full max-w-sm">
            <SearchInput placeholder={t("common.filters.search")} />
          </div>

          <FilterDropdown />

          <ActiveFilterBadges />
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable />
      ) : (
        <>
          {evidenceTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No evidence tasks found. Try adjusting your filters.
            </div>
          ) : (
            <DataTable data={evidenceTasks} />
          )}

          <PaginationControls />
        </>
      )}
    </div>
  );
}
