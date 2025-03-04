"use client";

import useSWR from "swr";
import {
  type FrameworkWithControls,
  getOrganizationFramework,
} from "../actions/getOrganizationFramework";

async function fetchOrganizationFramework(
  frameworkId: string,
): Promise<FrameworkWithControls> {
  const result = await getOrganizationFramework({ frameworkId });

  if (!result) {
    throw new Error("Failed to fetch frameworks");
  }

  const data = result.data?.data;
  if (!data) {
    throw new Error("Invalid response from server");
  }

  return data;
}

export function useOrganizationFramework(frameworkId: string) {
  const { data, error, isLoading, mutate } = useSWR<FrameworkWithControls>(
    ["organization-framework", frameworkId],
    () => fetchOrganizationFramework(frameworkId),
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
