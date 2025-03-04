"use client";

import useSWR from "swr";
import { getOrganizationEvidenceById } from "../../actions/getOrganizationEvidence";

interface UseOrganizationEvidenceProps {
  id: string;
}

async function fetchOrganizationEvidence({ id }: UseOrganizationEvidenceProps) {
  const result = await getOrganizationEvidenceById({ id });

  if (!result || "error" in result) {
    throw new Error(
      typeof result?.error === "string"
        ? result.error
        : "Failed to fetch organization evidence"
    );
  }

  return result.data;
}

export function useOrganizationEvidence({ id }: UseOrganizationEvidenceProps) {
  return useSWR(
    ["organization-evidence", id],
    () => fetchOrganizationEvidence({ id }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
}
