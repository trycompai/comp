"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Cloud, Loader2, Plus, Upload } from "lucide-react";
import { cn } from "@bubba/ui/cn";
import { Card, CardContent } from "@bubba/ui/card";
import { useI18n } from "@/locales/client";

interface FileUploadProps {
	onFileSelect: (file: File) => void;
	isUploading: boolean;
	accept?: Record<string, string[]>;
	maxSize?: number;
	/**
	 * The variant of the file upload component
	 * @default "default"
	 */
	variant?: "default" | "card";
	/**
	 * The height of the card variant
	 * @default "h-[220px]"
	 */
	cardHeight?: string;
}

export function FileUpload({
	onFileSelect,
	isUploading,
	accept = {
		"application/pdf": [".pdf"],
		"image/*": [".png", ".jpg", ".jpeg", ".gif"],
		"application/msword": [".doc"],
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
			".docx",
		],
		"application/vnd.ms-excel": [".xls"],
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
			".xlsx",
		],
	},
	maxSize = 10 * 1024 * 1024, // 10MB
	variant = "default",
	cardHeight = "h-[220px]",
}: FileUploadProps) {
	const t = useI18n();

	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			if (acceptedFiles.length > 0) {
				onFileSelect(acceptedFiles[0]);
			}
		},
		[onFileSelect],
	);

	const {
		getRootProps,
		getInputProps,
		isDragActive,
		isDragAccept,
		isDragReject,
	} = useDropzone({
		onDrop,
		accept,
		maxSize,
		multiple: false,
		disabled: isUploading,
	});

	// Card variant
	if (variant === "card") {
		return (
			<div {...getRootProps()}>
				<input {...getInputProps()} />
				<Card
					className={cn(
						"group cursor-pointer transition-all hover:shadow-md border-dashed border-2 border-primary/30 hover:border-primary flex flex-col overflow-hidden",
						cardHeight,
						isDragActive && "border-primary border-2 bg-primary/5",
						isDragAccept && "border-green-500 border-2 bg-green-50",
						isDragReject && "border-red-500 border-2 bg-red-50",
						isUploading && "pointer-events-none opacity-60",
					)}
				>
					<CardContent className="flex flex-col items-center justify-center h-full p-4">
						{isUploading ? (
							<div className="flex flex-col items-center justify-center">
								<div className="rounded-full bg-primary/10 p-3 mb-2">
									<Upload className="h-6 w-6 text-primary animate-pulse" />
								</div>
								<p className="text-sm font-medium text-center">
									{t("upload.fileUpload.uploadingText")}
								</p>
							</div>
						) : isDragActive ? (
							<div className="flex flex-col items-center justify-center">
								<div className="rounded-full bg-primary/10 p-3 mb-2">
									<Cloud className="h-6 w-6 text-primary" />
								</div>
								<p className="text-sm font-medium text-center">
									{t("upload.fileUpload.dropFileHere")}
								</p>
								<p className="text-xs text-muted-foreground mt-1 text-center">
									{t("upload.fileUpload.releaseToUpload")}
								</p>
							</div>
						) : (
							<>
								<div className="rounded-full bg-primary/10 p-3 mb-2">
									<Plus className="h-6 w-6 text-primary" />
								</div>
								<p className="text-sm font-medium text-center">
									{t("upload.fileUpload.addFiles")}
								</p>
								<p className="text-xs text-muted-foreground mt-1 text-center">
									{t("upload.fileUpload.uploadAdditionalEvidence")}
								</p>
								<p className="text-xs text-muted-foreground mt-2 text-center">
									{t("upload.fileUpload.dragDropOrClick")}
								</p>
							</>
						)}
					</CardContent>
				</Card>
			</div>
		);
	}

	// Default variant
	return (
		<div className="flex justify-start w-full">
			<div
				{...getRootProps()}
				className={cn(
					"flex flex-col items-center justify-center w-full max-w-sm rounded-lg border-2 border-dashed p-6 transition-colors",
					isDragActive
						? "border-primary/50 bg-primary/5"
						: "border-muted-foreground/25",
					isDragReject && "border-destructive/50 bg-destructive/5",
					isUploading && "pointer-events-none opacity-60",
				)}
			>
				<input {...getInputProps()} />
				<div className="flex flex-col items-center justify-center text-xs text-muted-foreground">
					{isUploading ? (
						<>
							<Loader2 className="h-6 w-6 animate-spin text-primary" />
							<p className="mt-2">{t("upload.fileUpload.uploadingFile")}</p>
						</>
					) : (
						<>
							<Cloud className="h-6 w-6 text-primary" />
							<p className="mt-2">
								{isDragActive
									? t("upload.fileUpload.dropFileHereAlt")
									: t("upload.fileUpload.dragDropOrClickToSelect")}
							</p>
							<p className="mt-1">
								{t("upload.fileUpload.maxFileSize", {
									size: Math.round(maxSize / 1024 / 1024),
								})}
							</p>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
