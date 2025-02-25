"use client";

import useSWR from "swr";
import { getOrganizationEvidenceTasks } from "../Actions/getOrganizationEvidenceTasks";
import type { PaginationMetadata } from "../Actions/getOrganizationEvidenceTasks";
import type { Frequency, OrganizationEvidence, Departments } from "@bubba/db";

// Define the props interface with clear types
interface UseOrganizationEvidenceTasksProps {
  search?: string | null;
  status?: "published" | "draft" | null;
  frequency?: Frequency | null;
  department?: Departments | null;
  assigneeId?: string | null;
  page?: number;
  pageSize?: number;
}

// Define the hook result type
interface UseOrganizationEvidenceTasksResult {
  data: OrganizationEvidence[] | undefined;
  pagination: PaginationMetadata | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

async function fetchEvidenceTasks(props: UseOrganizationEvidenceTasksProps) {
  const result = await getOrganizationEvidenceTasks(props);

  if (!result) {
    throw new Error("No result received");
  }

  if (result.serverError) {
    throw new Error(result.serverError);
  }

  if (result.validationErrors) {
    throw new Error(
      result.validationErrors._errors?.join(", ") ?? "Unknown error"
    );
  }

  return result.data?.data;
}

export function useOrganizationEvidenceTasks(
  props: UseOrganizationEvidenceTasksProps = {}
): UseOrganizationEvidenceTasksResult {
  const {
    search,
    status,
    frequency,
    department,
    assigneeId,
    page = 1,
    pageSize = 10,
  } = props;

  const { data, error, isLoading, mutate } = useSWR(
    [
      "organization-evidence-tasks",
      search,
      status,
      frequency,
      department,
      assigneeId,
      page,
      pageSize,
    ],
    () =>
      fetchEvidenceTasks({
        search,
        status,
        frequency,
        department,
        assigneeId,
        page,
        pageSize,
      }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    data: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  };
}
