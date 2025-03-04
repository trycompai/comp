"use client";

import useSWR from "swr";
import { getEvidenceDashboard } from "../actions/getEvidenceDashboard";

async function fetchEvidenceDashboard() {
  try {
    const result = await getEvidenceDashboard();

    if (!result) {
      throw new Error("No result received");
    }

    if (result.serverError) {
      throw new Error(result.serverError);
    }

    // Debug: Log the data received from the server action
    console.log("Evidence Dashboard Data:", result.data?.data);

    // Check if the data contains status information
    if (result.data?.data?.byAssignee) {
      const firstAssignee = Object.values(result.data.data.byAssignee)[0];
      if (firstAssignee && firstAssignee.length > 0) {
        console.log("First assignee's first item:", firstAssignee[0]);
      }
    }

    return result.data?.data;
  } catch (error) {
    console.error("Error fetching evidence dashboard:", error);
    throw error;
  }
}

export function useEvidenceDashboard() {
  const { data, error, isLoading, mutate } = useSWR(
    "evidence-dashboard",
    fetchEvidenceDashboard,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  // Debug: Log the data in the hook
  if (data) {
    console.log("useEvidenceDashboard hook data:", data);
  }

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}
