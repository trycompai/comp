"use client";
import useSWR from "swr";
import { getTest } from "@/app/[locale]/(app)/(dashboard)/tests/[testId]/actions/get-test";
import type { AppError, Test } from "@/app/[locale]/(app)/(dashboard)/tests/types";

async function fetchTest(testId: string): Promise<Test> {
  try {
    const response = await getTest({ testId });
    
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

export function useTest(testId: string) {
  const { data, error, isLoading, mutate } = useSWR<Test, AppError>(
    testId ? ["cloud-test-details", testId] : null,
    () => fetchTest(testId),
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