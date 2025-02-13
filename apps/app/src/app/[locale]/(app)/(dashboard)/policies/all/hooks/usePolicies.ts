"use client";

import useSWR from "swr";
import { getPolicies } from "../Actions/get-policies";
import type { OrganizationPolicy, Policy } from "@bubba/db";

const POLICIES_KEY = "policies";

interface PoliciesResponse {
  items: Array<OrganizationPolicy & { policy: Policy }>;
  total: number;
}

interface UsePoliciesOptions {
  page: number;
  perPage: number;
  search?: string;
  sort?: string;
  status?: string;
}

async function fetchPolicies({
  page,
  perPage,
}: UsePoliciesOptions): Promise<PoliciesResponse> {
  const response = await getPolicies({ page, perPage });

  if (!response?.data?.success || !response.data.data) {
    throw new Error(response?.data?.error || "Failed to fetch policies");
  }

  return response.data.data;
}

function filterAndSortPolicies(
  data: PoliciesResponse | undefined,
  { search, sort, status }: Partial<UsePoliciesOptions>
): PoliciesResponse | undefined {
  if (!data) return undefined;

  let filteredItems = [...data.items];

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    filteredItems = filteredItems.filter((item) =>
      item.policy.name.toLowerCase().includes(searchLower)
    );
  }

  // Apply status filter
  if (status && status !== "all") {
    filteredItems = filteredItems.filter((item) => item.status === status);
  }

  // Apply sorting
  if (sort) {
    const [field, direction] = sort.split(":");
    const multiplier = direction === "desc" ? -1 : 1;

    filteredItems.sort((a, b) => {
      switch (field) {
        case "name":
          return multiplier * a.policy.name.localeCompare(b.policy.name);
        case "lastUpdated":
          return multiplier * (a.updatedAt.getTime() - b.updatedAt.getTime());
        default:
          return 0;
      }
    });
  }

  return {
    items: filteredItems,
    total: data.total,
  };
}

export function usePolicies(options: UsePoliciesOptions) {
  const { data, error, isLoading, mutate } = useSWR(
    [POLICIES_KEY, options.page, options.perPage],
    () => fetchPolicies(options),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const filteredData = filterAndSortPolicies(data, options);

  return {
    data: filteredData,
    isLoading,
    error,
    mutate,
  };
}
