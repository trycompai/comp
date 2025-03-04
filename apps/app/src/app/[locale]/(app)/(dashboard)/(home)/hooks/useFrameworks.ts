"use client";

import type { FrameworksResponse } from "@/actions/framework/get-frameworks-action";
import { getFrameworksAction } from "@/actions/framework/get-frameworks-action";
import { selectFrameworksAction } from "@/actions/framework/select-frameworks-action";
import { useCallback, useState } from "react";
import useSWR from "swr";

async function fetchFrameworks(): Promise<FrameworksResponse> {
  const result = await getFrameworksAction();

  if (!result) {
    throw new Error("Failed to fetch frameworks");
  }

  const data = result.data?.data as FrameworksResponse | undefined;
  if (!data) {
    throw new Error("Invalid response from server");
  }

  return data;
}

export function useFrameworks() {
  const {
    data,
    error,
    isLoading,
    mutate: revalidateFrameworks,
  } = useSWR<FrameworksResponse>("frameworks", () => fetchFrameworks(), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const [isMutating, setIsMutating] = useState(false);

  const selectFrameworks = useCallback(
    async (frameworkIds: string[]) => {
      setIsMutating(true);
      try {
        const result = await selectFrameworksAction({ frameworkIds });

        if (!result?.data) {
          throw new Error("Failed to select frameworks");
        }

        await revalidateFrameworks();
      } catch (err) {
        console.error("selectFrameworksAction failed:", err);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [revalidateFrameworks],
  );

  return {
    frameworks: data?.frameworks ?? [],
    availableFrameworks: data?.availableFrameworks ?? [],
    isLoading,
    isMutating,
    error,
    revalidateFrameworks,
    selectFrameworks,
  };
}
