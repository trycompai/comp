"use client";

import { useCallback } from "react";
import { useToast } from "@bubba/ui/use-toast";
import { deleteEvidenceFile } from "../actions/deleteEvidenceFile";

interface UseFileDeleteProps {
	evidenceId: string;
	onSuccess: () => Promise<void>;
}

export function useFileDelete({ evidenceId, onSuccess }: UseFileDeleteProps) {
	const { toast } = useToast();

	const handleDelete = useCallback(
		async (fileUrl: string) => {
			try {
				const response = await deleteEvidenceFile({
					evidenceId,
					fileUrl,
				});

				if (!response?.data) {
					throw new Error("Failed to delete file");
				}

				if (!response.data.success) {
					throw new Error(response.data.error || "Failed to delete file");
				}

				await onSuccess();
				toast({
					title: "Success",
					description: "File deleted successfully",
				});
			} catch (error) {
				console.error("Error deleting file:", error);
				toast({
					title: "Error",
					description:
						error instanceof Error ? error.message : "Failed to delete file",
					variant: "destructive",
				});
			}
		},
		[evidenceId, onSuccess, toast],
	);

	return {
		handleDelete,
	};
}
