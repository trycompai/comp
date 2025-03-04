"use client";

import useSWR from "swr";
import { getOrganizationCategories } from "../actions/getOrganizationCategories";

async function fetchOrganizationCategories(frameworkId: string) {
  const result = await getOrganizationCategories({ frameworkId });

  if (!result) {
    throw new Error("Failed to fetch frameworks");
  }

  const data = result.data?.data;
  if (!data) {
    throw new Error("Invalid response from server");
  }

  return data;
}

export function useOrganizationCategories(frameworkId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    ["organization-categories", frameworkId],
    () => fetchOrganizationCategories(frameworkId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  return {
    data,
    isLoading,
    error,
    mutate,
  };
}
