"use client";

import useSWR from "swr";
import { fetcher } from "@/utils/fetcher";
import { useAnalyticsSWRKeyWithSecret } from "./useAnalyticsSWRKeyWithSecret";

interface PoliciesAnalyticsData {
	total: number;
	published: number;
	draft: number;
	needsReview: number;
	byMonth: Array<{
		date: string; // YYYY-MM-DD format
		count: number;
	}>;
	byAssignee: Array<{
		assignee: {
			id: string;
			name: string | null;
			email: string | null;
		} | null;
		count: number;
	}>;
}

const API_ENDPOINT = "/internal/dashboard/api/policies";

export function usePoliciesAnalytics() {
	const key = useAnalyticsSWRKeyWithSecret(API_ENDPOINT);

	const { data, error, isLoading } = useSWR<PoliciesAnalyticsData>(
		key,
		fetcher,
		{
			refreshInterval: 30000, // Poll every 30 seconds
			revalidateOnFocus: true,
			revalidateOnReconnect: true,
		},
	);

	return {
		data,
		isLoading,
		isError: error,
	};
}
