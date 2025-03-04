"use client";

import { useState, useCallback } from "react";
import { useToast } from "@bubba/ui/use-toast";
import { updateEvidenceUrls } from "@/actions/files/update-urls";
import type { ActionResponse } from "@/actions/types";

interface DraftUrl {
	id: string;
	url: string;
}

interface UseUrlManagementProps {
	evidenceId: string;
	currentUrls: string[];
	onSuccess: () => Promise<void>;
}

interface UpdateUrlsActionResponse
	extends ActionResponse<{
		additionalUrls: string[];
	}> {}

function isValidUrl(url: string): boolean {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

function formatUrl(url: string): string {
	if (!url) return "";

	// If it's already a valid URL, return it
	if (isValidUrl(url)) return url;

	// Add https:// if no protocol is specified
	if (!url.startsWith("http://") && !url.startsWith("https://")) {
		return `https://${url}`;
	}

	return url;
}

export function useUrlManagement({
	evidenceId,
	currentUrls,
	onSuccess,
}: UseUrlManagementProps) {
	const [draftUrls, setDraftUrls] = useState<DraftUrl[]>([]);
	const { toast } = useToast();

	const handleAddDraft = useCallback(() => {
		const newDraft: DraftUrl = {
			id: crypto.randomUUID(),
			url: "",
		};
		setDraftUrls((prev) => [...prev, newDraft]);
	}, []);

	const handleUpdateDraft = useCallback((id: string, url: string) => {
		setDraftUrls((prev) =>
			prev.map((draft) => (draft.id === id ? { ...draft, url } : draft)),
		);
	}, []);

	const handleRemoveDraft = useCallback((id: string) => {
		setDraftUrls((prev) => prev.filter((draft) => draft.id !== id));
	}, []);

	const handleSaveUrls = useCallback(async () => {
		try {
			// Format and validate all draft URLs
			const formattedDrafts = draftUrls
				.map((draft) => formatUrl(draft.url.trim()))
				.filter((url) => url && isValidUrl(url));

			if (formattedDrafts.length === 0) {
				toast({
					title: "Error",
					description: "Please enter at least one valid URL",
					variant: "destructive",
				});
				return;
			}

			// Combine current URLs with new ones, removing duplicates
			const allUrls = [...new Set([...currentUrls, ...formattedDrafts])];

			const result = await updateEvidenceUrls({
				evidenceId,
				urls: allUrls,
			});

			if (!result) {
				throw new Error("Failed to update URLs");
			}

			if (result.serverError) {
				throw new Error(result.serverError || "Failed to update URLs");
			}

			await onSuccess();
			setDraftUrls([]);
			toast({
				title: "Success",
				description: "Links saved successfully",
			});
		} catch (error) {
			console.error("Error saving URLs:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to save links",
				variant: "destructive",
			});
		}
	}, [draftUrls, currentUrls, evidenceId, onSuccess, toast]);

	const handleUrlRemove = useCallback(
		async (url: string) => {
			try {
				const updatedUrls = currentUrls.filter((u) => u !== url);
				const result = await updateEvidenceUrls({
					evidenceId,
					urls: updatedUrls,
				});

				if (!result) {
					throw new Error("Failed to remove URL");
				}

				if (result.serverError) {
					throw new Error(result.serverError || "Failed to remove URL");
				}

				await onSuccess();
				toast({
					title: "Success",
					description: "Link removed successfully",
				});
			} catch (error) {
				console.error("Error removing URL:", error);
				toast({
					title: "Error",
					description:
						error instanceof Error ? error.message : "Failed to remove link",
					variant: "destructive",
				});
			}
		},
		[currentUrls, evidenceId, onSuccess, toast],
	);

	return {
		draftUrls,
		handleAddDraft,
		handleUpdateDraft,
		handleRemoveDraft,
		handleSaveUrls,
		handleUrlRemove,
	};
}
