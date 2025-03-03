"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";

import { getTests } from "../actions/get-tests";
import type { CloudTest, AppError } from "../types";

interface TestsResponse {
  tests: CloudTest[];
  total: number;
}

interface TestsInput {
  search?: string;
  provider?: string;
  status?: string;
  page?: number;
  per_page?: number;
}

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

  return result.data.data as TestsResponse;
}

export function useTests() {
  const searchParams = useSearchParams();
  const search = searchParams.get("search") || undefined;
  const provider = searchParams.get("provider") || undefined;
  const status = searchParams.get("status") || undefined;
  const page = Number(searchParams.get("page")) || 1;
  const per_page = Number(searchParams.get("per_page")) || 10;

  /** SWR for fetching tests */
  const {
    data,
    error,
    isLoading,
    mutate: revalidateTests,
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