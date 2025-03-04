"use client";

import useSWR from "swr";
import { getEvidenceTasksStats } from "../actions/getEvidenceTasksStats";

// Define a simpler fetcher function
async function fetchEvidenceTasksStats() {
  try {
    const result = await getEvidenceTasksStats({});

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
  } catch (error) {
    console.error("Error fetching evidence tasks stats:", error);
    throw error;
  }
}

export function useEvidenceTasksStats() {
  const { data, error, isLoading, mutate } = useSWR(
    "evidence-tasks-stats",
    fetchEvidenceTasksStats,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    stats: data,
    isLoading,
    error,
    mutate,
  };
}
