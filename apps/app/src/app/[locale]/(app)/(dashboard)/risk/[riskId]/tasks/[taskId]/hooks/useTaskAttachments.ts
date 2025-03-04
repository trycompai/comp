"use client";

import useSWR from "swr";
import { getTaskAttachments } from "../actions/getTaskAttachments";

interface UseTaskAttachmentProps {
	id: string;
}

async function fetchTaskAttachments({ id }: UseTaskAttachmentProps) {
	const result = await getTaskAttachments({ id });

	if (!result || "error" in result) {
		throw new Error(
			typeof result?.error === "string"
				? result.error
				: "Failed to fetch task attachments",
		);
	}

	return result.data;
}

export function useTaskAttachments({ id }: UseTaskAttachmentProps) {
	return useSWR(["task-attachments", id], () => fetchTaskAttachments({ id }), {
		revalidateOnFocus: false,
		revalidateOnReconnect: false,
	});
}
