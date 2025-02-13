"use client";

import type { OrganizationPolicy, Policy } from "@bubba/db";
import useSWR from "swr";
import { getPolicy } from "../actions/get-policy";

const POLICY_KEY = "policy";

type OrganizationPolicyWithPolicy = OrganizationPolicy & {
  policy: Policy;
};

async function fetchPolicy(
  policyId: string
): Promise<OrganizationPolicyWithPolicy> {
  const response = await getPolicy({ policyId });

  if (!response?.data?.success || !response.data.data) {
    throw new Error(response?.data?.error || "Failed to fetch policy data");
  }

  return response.data.data;
}

export function usePolicy({ policyId }: { policyId: string }) {
  const { data, error, isLoading, mutate } =
    useSWR<OrganizationPolicyWithPolicy>(
      [POLICY_KEY, policyId],
      () => fetchPolicy(policyId),
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      }
    );

  return {
    data,
    isLoading,
    error,
    mutate,
  };
}
