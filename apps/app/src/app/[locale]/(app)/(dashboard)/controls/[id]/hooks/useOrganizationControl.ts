"use client";

import useSWR from "swr";
import { getOrganizationControl } from "../actions/getOrganizationControl";

async function fetchOrganizationControl(controlId: string) {
  const result = await getOrganizationControl({ controlId });

  if (!result) {
    throw new Error("Failed to fetch control");
  }

  const data = result.data?.data;
  if (!data) {
    throw new Error("Invalid response from server");
  }

  return data;
}

export function useOrganizationControl(controlId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    ["organization-control", controlId],
    () => fetchOrganizationControl(controlId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  return {
    data: data?.organizationControl,
    isLoading,
    error,
    mutate,
  };
}
