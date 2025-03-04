"use client";

import { useCallback, useState, useEffect } from "react";
import { FileUpload } from "./FileUpload";
import { useFileUpload } from "@/hooks/upload/use-file-upload";
import { useFileDelete } from "@/hooks/upload/use-file-delete";
import { useFilePreview } from "@/hooks/upload/use-file-preview";
import { FileCard } from "./FileCard";
import type { UPLOAD_TYPE } from "@/actions/types";
import { useI18n } from "@/locales/client";

type UploadType = (typeof UPLOAD_TYPE)[keyof typeof UPLOAD_TYPE];

interface FileSectionProps {
	uploadType: UploadType;
	evidenceId?: string;
	taskId?: string;
	fileUrls: string[];
	onSuccess: () => Promise<void>;
}

interface FilePreviewState {
	url: string | null;
	isLoading: boolean;
}

export function FileSection({
	uploadType,
	evidenceId,
	taskId,
	fileUrls,
	onSuccess,
}: FileSectionProps) {
	const t = useI18n();

	const { isUploading, handleFileUpload } = useFileUpload({
		uploadType,
		evidenceId: evidenceId || "",
		taskId: taskId || "",
		onSuccess,
	});

	const { handleDelete } = useFileDelete({
		uploadType,
		evidenceId: evidenceId || "",
		taskId: taskId || "",
		onSuccess,
	});

	const { getPreviewUrl } = useFilePreview({
		uploadType,
		fileUrl: "",
		evidenceId: evidenceId || "",
		taskId: taskId || "",
	});

	const [previewStates, setPreviewStates] = useState<
		Record<string, FilePreviewState>
	>({});
	const [openDialogId, setOpenDialogId] = useState<string | null>(null);

	const handlePreviewClick = useCallback(
		async (fileUrl: string) => {
			try {
				// Skip if already loading or loaded
				if (previewStates[fileUrl]?.isLoading || previewStates[fileUrl]?.url) {
					return;
				}

				setPreviewStates((prev) => ({
					...prev,
					[fileUrl]: { url: null, isLoading: true },
				}));

				const previewUrl = await getPreviewUrl(fileUrl);

				setPreviewStates((prev) => ({
					...prev,
					[fileUrl]: { url: previewUrl, isLoading: false },
				}));
			} catch (error) {
				console.error("Error loading preview:", error);
				setPreviewStates((prev) => ({
					...prev,
					[fileUrl]: { url: null, isLoading: false },
				}));
			}
		},
		[getPreviewUrl, previewStates],
	);

	useEffect(() => {
		const filesToLoad = fileUrls.filter((url) => !previewStates[url]);

		if (filesToLoad.length > 0) {
			const loadPreviews = async () => {
				for (const url of filesToLoad) {
					await handlePreviewClick(url);
				}
			};

			loadPreviews();
		}
	}, [fileUrls, handlePreviewClick, previewStates]);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<span className="text-xs text-muted-foreground">
					{t("upload.fileSection.filesUploaded", {
						count: fileUrls.length,
					})}
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
				<FileUpload
					onFileSelect={(file) => {
						handleFileUpload(file);
					}}
					isUploading={isUploading}
					variant="card"
					cardHeight="h-[220px]"
				/>

				{fileUrls.map((url) => {
					const previewState = previewStates[url] || {
						url: null,
						isLoading: false,
					};

					return (
						<FileCard
							key={url}
							url={url}
							previewState={previewState}
							isDialogOpen={openDialogId === url}
							onOpenChange={(open) => {
								if (open) {
									setOpenDialogId(url);
									handlePreviewClick(url);
								} else {
									setOpenDialogId(null);
								}
							}}
							onPreviewClick={handlePreviewClick}
							onDelete={handleDelete}
						/>
					);
				})}
			</div>
		</div>
	);
}
