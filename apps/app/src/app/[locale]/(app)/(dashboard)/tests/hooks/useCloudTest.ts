"use client";

import useSWR from "swr";
import { getCloudTestDetails } from "../[testId]/actions/get-cloud-test-details";
import type { AppError, CloudTestDetails } from "../[testId]/types";

async function fetchCloudTestDetails(testId: string): Promise<CloudTestDetails> {
  try {
    const response = await getCloudTestDetails({ testId });
    
    if (response.success) {
      return response.data;
    } else {
      throw response.error;
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'message' in error) {
      throw error as AppError;
    }
    throw { message: "An unexpected error occurred" };
  }
}

export function useCloudTestDetails(testId: string) {
  const { data, error, isLoading, mutate } = useSWR<CloudTestDetails, AppError>(
    testId ? ["cloud-test-details", testId] : null,
    () => fetchCloudTestDetails(testId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    cloudTest: data,
    isLoading,
    error,
    mutate,
  };
} 