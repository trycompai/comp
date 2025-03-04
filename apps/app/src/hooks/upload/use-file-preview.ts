"use client";

import { useCallback, useState } from "react";
import { useToast } from "@bubba/ui/use-toast";
import { getFileUrl } from "@/actions/files/get-file-url";
import { UPLOAD_TYPE } from "@/actions/types";

type UploadType = (typeof UPLOAD_TYPE)[keyof typeof UPLOAD_TYPE];

interface UseFilePreviewProps {
	uploadType: UploadType;
	fileUrl: string;
	evidenceId?: string;
	taskId?: string;
}

interface UseFilePreviewReturn {
	isLoading: boolean;
	getPreviewUrl: (fileUrl: string) => Promise<string>;
}

interface FileUrlResponse {
	signedUrl: string;
}

export function useFilePreview({
	uploadType,
	fileUrl,
	evidenceId,
	taskId,
}: UseFilePreviewProps): UseFilePreviewReturn {
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const { toast } = useToast();

	const getPreviewUrl = useCallback(
		async (fileUrl: string): Promise<string> => {
			setIsLoading(true);
			try {
				if (uploadType === UPLOAD_TYPE.evidence && evidenceId) {
					const response = await getFileUrl({
						uploadType,
						fileUrl,
						evidenceId,
					});

					if (!response?.data) {
						throw new Error("Failed to get signed URL");
					}

					const { signedUrl } = response.data as FileUrlResponse;
					if (!signedUrl) {
						throw new Error("Invalid signed URL response");
					}

					return signedUrl;
				}

				if (uploadType === UPLOAD_TYPE.riskTask && taskId) {
					const response = await getFileUrl({
						uploadType,
						fileUrl,
						taskId,
					});

					if (!response?.data) {
						throw new Error("Failed to get signed URL");
					}

					const { signedUrl } = response.data as FileUrlResponse;
					if (!signedUrl) {
						throw new Error("Invalid signed URL response");
					}

					return signedUrl;
				}

				throw new Error(
					`Missing required parameters for upload type: ${uploadType}`,
				);
			} catch (error) {
				console.error("Error getting file URL:", error);
				const errorMessage =
					error instanceof Error
						? error.message
						: "Failed to load file preview";
				toast({
					title: "Error",
					description: errorMessage,
					variant: "destructive",
				});
				throw error;
			} finally {
				setIsLoading(false);
			}
		},
		[uploadType, evidenceId, taskId, toast],
	);

	return {
		isLoading,
		getPreviewUrl,
	};
}
