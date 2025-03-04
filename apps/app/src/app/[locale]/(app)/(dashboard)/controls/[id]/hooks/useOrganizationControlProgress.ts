"use client";

import useSWR from "swr";
import { getOrganizationControlProgress } from "../actions/getOrganizationControlProgress";

async function fetchOrganizationControlProgress(controlId: string) {
  const result = await getOrganizationControlProgress({ controlId });

  if (!result || "error" in result || !result.data) {
    throw new Error("Failed to fetch control progress");
  }

  return result.data.data;
}

export function useOrganizationControlProgress(controlId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    ["organization-control-progress", controlId],
    () => fetchOrganizationControlProgress(controlId),
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
