"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQueryState } from "nuqs";
import { useOrganizationEvidenceTasks } from "./useEvidenceTasks";
import type { EvidenceTaskRow } from "../Components/data-table/types";
import { ALL_DEPARTMENTS, ALL_FREQUENCIES } from "../constants";
import type { Frequency, Departments } from "@bubba/db";

interface Assignee {
  id: string;
  name: string | null;
  image: string | null;
}

interface EvidenceTableContextType {
  // State
  search: string | null;
  status: string | null;
  frequency: string | null;
  department: string | null;
  assigneeId: string | null;
  page: string;
  pageSize: string;

  // Setters
  setSearch: (value: string | null) => void;
  setStatus: (value: string | null) => void;
  setFrequency: (value: string | null) => void;
  setDepartment: (value: string | null) => void;
  setAssigneeId: (value: string | null) => void;
  setPage: (value: string) => void;
  setPageSize: (value: string) => void;

  // Data
  evidenceTasks: EvidenceTaskRow[] | undefined;
  pagination:
    | {
        totalCount: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
      }
    | undefined;
  isLoading: boolean;
  error: Error | undefined;

  // Derived data
  frequencies: Frequency[];
  departments: Departments[];
  assignees: Assignee[];
  hasActiveFilters: boolean;

  // Actions
  clearFilters: () => void;
}

const EvidenceTableContext = createContext<
  EvidenceTableContextType | undefined
>(undefined);

export function EvidenceTableProvider({ children }: { children: ReactNode }) {
  // Query state
  const [search, setSearch] = useQueryState("search");
  const [status, setStatus] = useQueryState("status");
  const [frequency, setFrequency] = useQueryState("frequency");
  const [department, setDepartment] = useQueryState("department");
  const [assigneeId, setAssigneeId] = useQueryState("assigneeId");
  const [page, setPage] = useQueryState("page", { defaultValue: "1" });
  const [pageSize, setPageSize] = useQueryState("pageSize", {
    defaultValue: "10",
  });

  const currentPage = Number.parseInt(page, 10);
  const currentPageSize = Number.parseInt(pageSize, 10);

  // Fetch data
  const {
    data: rawEvidenceTasks,
    pagination,
    isLoading,
    error,
  } = useOrganizationEvidenceTasks({
    search,
    status: status as "published" | "draft" | null,
    frequency: frequency as any,
    department: department as any,
    assigneeId,
    page: currentPage,
    pageSize: currentPageSize,
  });

  // Format data for the table
  const evidenceTasks = useMemo(() => {
    return rawEvidenceTasks?.map((task) => ({
      ...task,
      evidence: {
        name: task.name,
      },
    })) as EvidenceTaskRow[] | undefined;
  }, [rawEvidenceTasks]);

  // Predefined frequencies and departments
  const frequencies = useMemo(() => ALL_FREQUENCIES, []);
  const departments = useMemo(() => ALL_DEPARTMENTS, []);

  // Get unique assignees for the dropdown
  const assignees = useMemo(() => {
    if (!evidenceTasks) return [];

    const uniqueAssignees = new Map<
      string,
      { id: string; name: string | null; image: string | null }
    >();

    for (const task of evidenceTasks) {
      if (task.assignee) {
        uniqueAssignees.set(task.assignee.id, {
          id: task.assignee.id,
          name: task.assignee.name,
          image: task.assignee.image,
        });
      }
    }

    return Array.from(uniqueAssignees.values()).sort((a, b) => {
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [evidenceTasks]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      status !== null ||
      frequency !== null ||
      department !== null ||
      assigneeId !== null
    );
  }, [status, frequency, department, assigneeId]);

  // Clear all filters
  const clearFilters = () => {
    setStatus(null);
    setFrequency(null);
    setDepartment(null);
    setAssigneeId(null);
    setPage("1"); // Reset to first page when clearing filters
  };

  // Create context value
  const contextValue = {
    // State
    search,
    status,
    frequency,
    department,
    assigneeId,
    page,
    pageSize,

    // Setters
    setSearch,
    setStatus,
    setFrequency,
    setDepartment,
    setAssigneeId,
    setPage,
    setPageSize,

    // Data
    evidenceTasks,
    pagination,
    isLoading,
    error,

    // Derived data
    frequencies,
    departments,
    assignees,
    hasActiveFilters,

    // Actions
    clearFilters,
  };

  return (
    <EvidenceTableContext.Provider value={contextValue}>
      {children}
    </EvidenceTableContext.Provider>
  );
}

export function useEvidenceTable() {
  const context = useContext(EvidenceTableContext);

  if (context === undefined) {
    throw new Error(
      "useEvidenceTable must be used within an EvidenceTableProvider"
    );
  }

  return context;
}
