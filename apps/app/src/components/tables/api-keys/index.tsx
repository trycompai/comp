"use client";

import { revokeApiKeyAction } from "@/actions/organization/revoke-api-key-action";
import { useApiKeys } from "@/hooks/use-api-keys";
import { useI18n } from "@/locales/client";
import { Button } from "@bubba/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@bubba/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bubba/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@bubba/ui/table";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { CreateApiKeyDialog } from "./create-api-key-dialog";

export function ApiKeysTable() {
	const t = useI18n();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null);
	const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);

	// Use the custom hook for API keys data fetching
	const { apiKeys, isLoading, error, refresh: refreshApiKeys } = useApiKeys();

	// Use the useAction hook for revoking API keys
	const { execute: revokeApiKey, status: isRevoking } = useAction(
		revokeApiKeyAction,
		{
			onSuccess: () => {
				toast.success(t("settings.api_keys.revoked_success"));
				setIsRevokeDialogOpen(false);
				setKeyToRevoke(null);
				// Refresh the API keys data after successful revocation
				refreshApiKeys();
			},
			onError: () => {
				toast.error(t("settings.api_keys.revoked_error"));
				setIsRevokeDialogOpen(false);
				setKeyToRevoke(null);
			},
		},
	);

	const handleRevokeClick = (id: string) => {
		setKeyToRevoke(id);
		setIsRevokeDialogOpen(true);
	};

	const handleConfirmRevoke = () => {
		if (keyToRevoke) {
			revokeApiKey({ id: keyToRevoke });
		}
	};

	const handleCancelRevoke = () => {
		setIsRevokeDialogOpen(false);
		setKeyToRevoke(null);
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "-";
		return new Date(dateString).toLocaleDateString();
	};

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("settings.api_keys.list_title")}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="py-8 text-center text-destructive">{error}</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>{t("settings.api_keys.list_title")}</CardTitle>
						<CardDescription>
							{t("settings.api_keys.list_description")}
						</CardDescription>
					</div>
					<Button
						onClick={() => setIsCreateDialogOpen(true)}
						className="flex items-center gap-1"
					>
						<Plus className="h-4 w-4" />
						{t("settings.api_keys.create")}
					</Button>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex justify-center py-8">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					) : apiKeys.length === 0 ? (
						<div className="py-8 text-center text-muted-foreground">
							{t("settings.api_keys.no_keys")}
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("settings.api_keys.name")}</TableHead>
									<TableHead>{t("settings.api_keys.created")}</TableHead>
									<TableHead>{t("settings.api_keys.expires")}</TableHead>
									<TableHead>{t("settings.api_keys.last_used")}</TableHead>
									<TableHead className="text-right">
										{t("settings.api_keys.actions")}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{apiKeys.map((apiKey) => (
									<TableRow key={apiKey.id}>
										<TableCell className="font-medium">{apiKey.name}</TableCell>
										<TableCell>{formatDate(apiKey.createdAt)}</TableCell>
										<TableCell>
											{apiKey.expiresAt
												? formatDate(apiKey.expiresAt)
												: t("settings.api_keys.never")}
										</TableCell>
										<TableCell>
											{apiKey.lastUsedAt
												? formatDate(apiKey.lastUsedAt)
												: t("settings.api_keys.never_used")}
										</TableCell>
										<TableCell className="text-right">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleRevokeClick(apiKey.id)}
												disabled={isRevoking === "executing"}
											>
												<Trash2 className="h-4 w-4 text-destructive" />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
				<CardFooter className="text-sm text-muted-foreground">
					{t("settings.api_keys.security_note")}
				</CardFooter>

				<CreateApiKeyDialog
					open={isCreateDialogOpen}
					onOpenChange={setIsCreateDialogOpen}
					onSuccess={refreshApiKeys}
				/>
			</Card>

			<Dialog open={isRevokeDialogOpen} onOpenChange={handleCancelRevoke}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>{t("settings.api_keys.revoke_title")}</DialogTitle>
						<DialogDescription>
							{t("settings.api_keys.revoke_confirm")}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2 sm:justify-end">
						<Button
							type="button"
							variant="outline"
							onClick={handleCancelRevoke}
							disabled={isRevoking === "executing"}
						>
							{t("common.actions.cancel")}
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={handleConfirmRevoke}
							disabled={isRevoking === "executing"}
						>
							{isRevoking === "executing" && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							{t("settings.api_keys.revoke")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
