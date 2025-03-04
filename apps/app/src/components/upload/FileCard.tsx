"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@bubba/ui/alert-dialog";
import { Button } from "@bubba/ui/button";
import { Card, CardContent, CardFooter } from "@bubba/ui/card";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@bubba/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@bubba/ui/tooltip";
import { ExternalLink, Loader2, Maximize2, Trash } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { FileIcon } from "./FileIcon";
import { useI18n } from "@/locales/client";

interface FilePreviewState {
	url: string | null;
	isLoading: boolean;
}

interface FileCardProps {
	url: string;
	previewState: FilePreviewState;
	isDialogOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onPreviewClick: (url: string) => Promise<void>;
	onDelete: (url: string) => Promise<void>;
}

export function FileCard({
	url,
	previewState,
	isDialogOpen,
	onOpenChange,
	onPreviewClick,
	onDelete,
}: FileCardProps) {
	const t = useI18n();

	const fileName = url.split("/").pop() || url;
	const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
	const isPdf = /\.pdf$/i.test(fileName);

	// Load preview automatically when component mounts
	const [hasLoadedPreview, setHasLoadedPreview] = useState(false);

	useEffect(() => {
		if (!hasLoadedPreview && !previewState.url && !previewState.isLoading) {
			onPreviewClick(url);
			setHasLoadedPreview(true);
		}
	}, [
		hasLoadedPreview,
		onPreviewClick,
		previewState.isLoading,
		previewState.url,
		url,
	]);

	return (
		<Card className="group transition-all hover:shadow-md h-[220px] flex flex-col overflow-hidden">
			<CardContent className="p-0 flex-grow overflow-hidden relative">
				<Dialog open={isDialogOpen} onOpenChange={onOpenChange}>
					{/* Preview content directly in the card */}
					<div className="w-full h-[160px] flex items-center justify-center p-2 relative">
						{previewState.isLoading ? (
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						) : previewState.url && isImage ? (
							<div className="relative w-full h-full">
								<Image
									src={previewState.url}
									alt={fileName}
									fill
									className="object-contain"
									sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 50vw"
								/>
								<DialogTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										className="absolute bottom-1 right-1 h-6 w-6 bg-background/80 hover:bg-background"
									>
										<Maximize2 className="h-3 w-3" />
									</Button>
								</DialogTrigger>
							</div>
						) : previewState.url && isPdf ? (
							<div className="relative w-full h-full">
								<iframe
									src={previewState.url}
									className="w-full h-full"
									title={fileName}
								/>
								<DialogTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										className="absolute bottom-1 right-1 h-6 w-6 bg-background/80 hover:bg-background"
									>
										<Maximize2 className="h-3 w-3" />
									</Button>
								</DialogTrigger>
							</div>
						) : (
							<div className="flex flex-col items-center justify-center">
								<div className="flex items-center justify-center h-20 w-20 bg-accent/20 rounded-md overflow-hidden mb-2">
									<FileIcon fileName={fileName} />
								</div>
								<DialogTrigger asChild>
									<Button
										size="sm"
										variant="ghost"
										className="text-xs text-muted-foreground hover:text-foreground"
									>
										{t("upload.fileCard.preview")}
									</Button>
								</DialogTrigger>
							</div>
						)}
					</div>

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<h4 className="text-sm font-medium truncate text-center max-w-full px-2">
									{fileName}
								</h4>
							</TooltipTrigger>
							<TooltipContent>
								<p>{fileName}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					<DialogContent className="max-w-4xl w-full">
						<DialogTitle className="flex items-center justify-between mb-4">
							<span>{t("upload.fileCard.filePreview", { fileName })}</span>
						</DialogTitle>

						{previewState.url ? (
							<div className="relative w-full h-[80vh]">
								{isImage ? (
									<div className="relative w-full h-full">
										<Image
											src={previewState.url}
											alt={fileName}
											fill
											className="object-contain"
											sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 50vw"
										/>
									</div>
								) : isPdf ? (
									<iframe
										src={previewState.url}
										className="w-full h-full"
										title={fileName}
									/>
								) : (
									<div className="flex items-center justify-center h-full">
										<p className="text-muted-foreground">
											{t("upload.fileCard.previewNotAvailable")}
										</p>
									</div>
								)}
							</div>
						) : (
							<div className="flex items-center justify-center h-[80vh]">
								<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
							</div>
						)}
					</DialogContent>
				</Dialog>
			</CardContent>
			<CardFooter className="justify-center gap-3 py-2 px-3 border-t mt-auto">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								size="sm"
								variant="outline"
								asChild
								className="h-10 w-10 rounded-full"
							>
								<a
									href={previewState.url || "#"}
									target="_blank"
									rel="noopener noreferrer"
									className="text-primary hover:text-primary/80 flex items-center justify-center"
									onClick={(e) => {
										if (!previewState.url) {
											e.preventDefault();
											onPreviewClick(url);
										}
									}}
								>
									<ExternalLink className="h-4 w-4" />
								</a>
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>{t("upload.fileCard.openFile")}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>

				<AlertDialog>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<AlertDialogTrigger asChild>
									<Button
										size="sm"
										variant="outline"
										className="rounded-full hover:text-destructive hover:border-destructive h-10 w-10"
									>
										<Trash className="h-4 w-4" />
									</Button>
								</AlertDialogTrigger>
							</TooltipTrigger>
							<TooltipContent>
								<p>{t("upload.fileCard.deleteFile")}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								{t("upload.fileCard.deleteFileConfirmTitle")}
							</AlertDialogTitle>
							<AlertDialogDescription>
								{t("upload.fileCard.deleteFileConfirmDescription")}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>
								{t("common.actions.cancel")}
							</AlertDialogCancel>
							<AlertDialogAction onClick={() => onDelete(url)}>
								{t("common.actions.delete")}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</CardFooter>
		</Card>
	);
}
