"use client";

import { createApiKeyAction } from "@/actions/organization/create-api-key-action";
import { useI18n } from "@/locales/client";
import { Button } from "@comp/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@comp/ui/dialog";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@comp/ui/sheet";
import { Input } from "@comp/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@comp/ui/select";
import { Copy, Check, Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { useMediaQuery } from "@comp/ui/hooks";

interface CreateApiKeyDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

export function CreateApiKeyDialog({
	open,
	onOpenChange,
	onSuccess,
}: CreateApiKeyDialogProps) {
	const t = useI18n();
	const [name, setName] = useState("");
	const [expiration, setExpiration] = useState<
		"never" | "30days" | "90days" | "1year"
	>("never");
	const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const isMobile = useMediaQuery("(max-width: 640px)");

	const { execute: createApiKey, status: isCreating } = useAction(
		createApiKeyAction,
		{
			onSuccess: (data) => {
				if (data.data?.data?.key) {
					setCreatedApiKey(data.data.data.key);
					if (onSuccess) onSuccess();
				}
			},
			onError: (error) => {
				toast.error(t("settings.api_keys.create_error"));
			},
		},
	);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		createApiKey({
			name,
			expiresAt: expiration,
		});
	};

	const handleClose = () => {
		if (isCreating !== "executing") {
			setName("");
			setExpiration("never");
			setCreatedApiKey(null);
			setCopied(false);
			onOpenChange(false);
		}
	};

	const copyToClipboard = async () => {
		if (createdApiKey) {
			try {
				await navigator.clipboard.writeText(createdApiKey);
				setCopied(true);
				toast.success(t("settings.api_keys.copied"));

				// Reset copied state after 2 seconds
				setTimeout(() => {
					setCopied(false);
				}, 2000);
			} catch (err) {
				toast.error(t("common.actions.error"));
			}
		}
	};

	// Form content for reuse in both Dialog and Sheet
	const renderFormContent = () => (
		<form onSubmit={handleSubmit} className="space-y-4 py-4">
			<div className="space-y-2">
				<label htmlFor="name" className="text-sm font-medium leading-none">
					{t("settings.api_keys.name")}
				</label>
				<Input
					id="name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder={t("settings.api_keys.name_placeholder")}
					required
					className="w-full"
				/>
			</div>
			<div className="space-y-2">
				<label
					htmlFor="expiration"
					className="text-sm font-medium leading-none"
				>
					{t("settings.api_keys.expiration")}
				</label>
				<Select
					value={expiration}
					onValueChange={(value) =>
						setExpiration(value as "never" | "30days" | "90days" | "1year")
					}
				>
					<SelectTrigger id="expiration" className="w-full">
						<SelectValue
							placeholder={t("settings.api_keys.expiration_placeholder")}
						/>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="never">
							{t("settings.api_keys.never")}
						</SelectItem>
						<SelectItem value="30days">
							{t("settings.api_keys.thirty_days")}
						</SelectItem>
						<SelectItem value="90days">
							{t("settings.api_keys.ninety_days")}
						</SelectItem>
						<SelectItem value="1year">
							{t("settings.api_keys.one_year")}
						</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className="flex flex-col sm:flex-row gap-2 pt-2 justify-end">
				<Button type="button" variant="outline" onClick={handleClose}>
					{t("common.actions.cancel")}
				</Button>
				<Button
					type="submit"
					disabled={isCreating === "executing"}
					className="w-full sm:w-auto"
				>
					{isCreating === "executing" && (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					)}
					{t("settings.api_keys.create")}
				</Button>
			</div>
		</form>
	);

	// Created key content for reuse in both Dialog and Sheet
	const renderCreatedKeyContent = () => (
		<>
			<div className="space-y-4 py-4">
				<div className="space-y-2">
					<p className="text-sm font-medium">
						{t("settings.api_keys.api_key")}
					</p>
					<div className="flex items-center">
						<div className="relative w-full">
							<div className="rounded-md bg-muted p-3 pr-10 overflow-hidden">
								<div className="overflow-x-auto">
									<code className="text-sm break-all">{createdApiKey}</code>
								</div>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="absolute right-1 top-1/2 -translate-y-1/2"
								onClick={copyToClipboard}
							>
								{copied ? (
									<Check className="h-4 w-4" />
								) : (
									<Copy className="h-4 w-4" />
								)}
							</Button>
						</div>
					</div>
					<p className="text-xs text-muted-foreground mt-2">
						{t("settings.api_keys.save_warning")}
					</p>
				</div>
			</div>
			<div className="flex justify-end">
				<Button onClick={handleClose} className="w-full sm:w-auto">
					{t("settings.api_keys.done")}
				</Button>
			</div>
		</>
	);

	// Render different UI components for mobile vs desktop
	if (isMobile) {
		return (
			<Sheet open={open} onOpenChange={handleClose}>
				<SheetContent side="right" className="p-0 h-full w-full sm:max-w-md">
					<div className="px-4 py-6 h-full overflow-y-auto">
						{createdApiKey ? (
							<>
								<SheetHeader className="text-left mb-4">
									<SheetTitle>
										{t("settings.api_keys.created_title")}
									</SheetTitle>
									<SheetDescription>
										{t("settings.api_keys.created_description")}
									</SheetDescription>
								</SheetHeader>
								{renderCreatedKeyContent()}
							</>
						) : (
							<>
								<SheetHeader className="text-left mb-4">
									<SheetTitle>{t("settings.api_keys.create_title")}</SheetTitle>
									<SheetDescription>
										{t("settings.api_keys.create_description")}
									</SheetDescription>
								</SheetHeader>
								{renderFormContent()}
							</>
						)}
					</div>
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-md">
				{createdApiKey ? (
					<>
						<DialogHeader>
							<DialogTitle>{t("settings.api_keys.created_title")}</DialogTitle>
							<DialogDescription>
								{t("settings.api_keys.created_description")}
							</DialogDescription>
						</DialogHeader>
						{renderCreatedKeyContent()}
					</>
				) : (
					<>
						<DialogHeader>
							<DialogTitle>{t("settings.api_keys.create_title")}</DialogTitle>
							<DialogDescription>
								{t("settings.api_keys.create_description")}
							</DialogDescription>
						</DialogHeader>
						{renderFormContent()}
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
