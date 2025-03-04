"use client";

import useSWR from "swr";
import { getEmployeeDetails } from "../[employeeId]/actions/get-employee-details";
import type { EmployeeDetails, AppError } from "../[employeeId]/types";

async function fetchEmployeeDetails(
  employeeId: string,
): Promise<EmployeeDetails> {
  const result = await getEmployeeDetails({ employeeId });

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

  return result.data?.data as EmployeeDetails;
}

export function useEmployeeDetails(employeeId: string) {
  const { data, error, isLoading, mutate } = useSWR<EmployeeDetails, AppError>(
    ["employee-details", employeeId],
    () => fetchEmployeeDetails(employeeId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  return {
    employee: data,
    isLoading,
    error,
    mutate,
  };
}
