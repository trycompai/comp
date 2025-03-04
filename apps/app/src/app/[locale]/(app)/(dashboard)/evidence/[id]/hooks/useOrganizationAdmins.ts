"use client";

import useSWR from "swr";
import { getOrganizationAdmins } from "../../actions/getOrganizationAdmins";

export interface Admin {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
}

async function fetchOrganizationAdmins(): Promise<Admin[]> {
  try {
    const result = await getOrganizationAdmins();

    if (!result) {
      throw new Error("Failed to fetch organization admins");
    }

    if ("error" in result && typeof result.error === "string") {
      throw new Error(result.error);
    }

    return result.data?.data || [];
  } catch (error) {
    console.error("Error fetching admins:", error);
    throw error;
  }
}

export function useOrganizationAdmins() {
  return useSWR<Admin[]>("organization-admins", fetchOrganizationAdmins, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
}
