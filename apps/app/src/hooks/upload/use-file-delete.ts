"use client";

import { useCallback } from "react";
import { useToast } from "@bubba/ui/use-toast";
import { deleteFile } from "@/actions/files/delete-file";
import type { UPLOAD_TYPE } from "@/actions/types";

type UploadType = (typeof UPLOAD_TYPE)[keyof typeof UPLOAD_TYPE];

interface UseFileDeleteProps {
	uploadType: UploadType;
	evidenceId?: string;
	taskId?: string;
	onSuccess: () => Promise<void>;
}

export function useFileDelete({
	uploadType,
	evidenceId,
	taskId,
	onSuccess,
}: UseFileDeleteProps) {
	const { toast } = useToast();

	const handleDelete = useCallback(
		async (fileUrl: string) => {
			try {
				const response = await deleteFile({
					uploadType,
					evidenceId: evidenceId || "",
					taskId: taskId || "",
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
		[evidenceId, taskId, uploadType, onSuccess, toast],
	);

	return {
		handleDelete,
	};
}
