"use client";
import { useState } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";

import { getTests } from "../actions/get-tests";
import type { TestsResponse, TestsInput, AppError } from "../types";

/** Fetcher function for tests */
async function fetchTests(input: TestsInput): Promise<TestsResponse> {
  const result = await getTests(input);

  if (!result) {
    const error: AppError = {
      code: "UNEXPECTED_ERROR",
      message: "An unexpected error occurred",
    };
    throw error;
  }

  if (result.serverError) {
    const error: AppError = {
      code: "UNEXPECTED_ERROR",
      message: result.serverError || "An unexpected error occurred",
    };
    throw error;
  }

  if (!result.data) {
    const error: AppError = {
      code: "UNEXPECTED_ERROR",
      message: "No data returned from server",
    };
    throw error;
  }

  return result.data.data as TestsResponse;
}

export function useTests() {
  const searchParams = useSearchParams();
  const search = searchParams.get("search") || undefined;
  const providerParam = searchParams.get("provider") || undefined;
  const provider = providerParam && ["AWS", "AZURE", "GCP"].includes(providerParam) 
    ? providerParam as "AWS" | "AZURE" | "GCP" 
    : undefined;
  const status = searchParams.get("status") || undefined;
  const page = Number(searchParams.get("page")) || 1;
  const per_page = Number(searchParams.get("per_page")) || 10;

  /** SWR for fetching tests */
  const {
    data,
    error,
    isLoading
  } = useSWR<TestsResponse, AppError>(
    ["tests", { search, provider, status, page, per_page }],
    () => fetchTests({ search, provider, status, page, per_page }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  /** Track local mutation loading state */
  const [isMutating, setIsMutating] = useState(false);

  return {
    tests: data?.tests ?? [],
    total: data?.total ?? 0,
    isLoading,
    isMutating,
    error
  };
} 