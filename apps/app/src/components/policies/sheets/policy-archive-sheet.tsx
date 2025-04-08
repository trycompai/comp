"use client";

import { archivePolicyAction } from "@/actions/policies/archive-policy";
import { useI18n } from "@/locales/client";
import { Button } from "@comp/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@comp/ui/drawer";
import { useMediaQuery } from "@comp/ui/hooks";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@comp/ui/sheet";
import { ArchiveIcon, ArchiveRestoreIcon, X } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { toast } from "sonner";
import { Policy } from "@comp/db/types";

export function PolicyArchiveSheet({
	policy,
}: {
	policy: Policy;
}) {
	const t = useI18n();
	const router = useRouter();
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const [open, setOpen] = useQueryState("archive-policy-sheet");
	const isOpen = Boolean(open);
	const isArchived = policy.isArchived;

	const archivePolicy = useAction(archivePolicyAction, {
		onSuccess: (result) => {
			if (result) {
				toast.success(t("policies.archive.success"));
				// Redirect to policies list after successful archive
				router.push(`/${policy.organizationId}/policies/all`);
			} else {
				toast.success(t("policies.archive.restore_success"));
				// Stay on the policy page after restore
				router.refresh();
			}
			handleOpenChange(false);
		},
		onError: () => {
			toast.error(t("policies.archive.error"));
		},
	});

	const handleOpenChange = (open: boolean) => {
		setOpen(open ? "true" : null);
	};

	const handleAction = () => {
		archivePolicy.execute({
			id: policy.id,
			action: isArchived ? "restore" : "archive",
		});
	};

	const content = (
		<div className="space-y-6">
			<p className="text-sm text-muted-foreground">
				{isArchived
					? t("policies.archive.restore_description")
					: t("policies.archive.description")}
			</p>
			<div className="flex justify-end gap-2">
				<Button
					variant="outline"
					onClick={() => handleOpenChange(false)}
					disabled={archivePolicy.status === "executing"}
				>
					{t("policies.archive.cancel")}
				</Button>
				<Button
					variant={isArchived ? "default" : "destructive"}
					onClick={handleAction}
					disabled={archivePolicy.status === "executing"}
				>
					{archivePolicy.status === "executing" ? (
						<span className="flex items-center gap-2">
							<span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
							{isArchived
								? t("policies.archive.restore_confirm")
								: t("policies.archive.confirm")}
						</span>
					) : (
						<span className="flex items-center gap-2">
							{isArchived ? (
								<>
									<ArchiveRestoreIcon className="h-3 w-3" />
									{t("policies.archive.restore_confirm")}
								</>
							) : (
								<>
									<ArchiveIcon className="h-3 w-3" />
									{t("policies.archive.confirm")}
								</>
							)}
						</span>
					)}
				</Button>
			</div>
		</div>
	);

	if (isDesktop) {
		return (
			<Sheet open={isOpen} onOpenChange={handleOpenChange}>
				<SheetContent>
					<SheetHeader className="mb-6">
						<div className="flex justify-between items-center flex-row">
							<SheetTitle>
								{isArchived
									? t("policies.archive.restore_title")
									: t("policies.archive.title")}
							</SheetTitle>
							<Button
								size="icon"
								variant="ghost"
								className="p-0 m-0 size-auto hover:bg-transparent"
								onClick={() => setOpen(null)}
							>
								<X className="h-5 w-5" />
							</Button>
						</div>
						<SheetDescription>{policy.name}</SheetDescription>
					</SheetHeader>
					{content}
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<Drawer open={isOpen} onOpenChange={handleOpenChange}>
			<DrawerTitle hidden>
				{isArchived
					? t("policies.archive.restore_title")
					: t("policies.archive.title")}
			</DrawerTitle>
			<DrawerContent className="p-6">
				<div className="mb-4">
					<h3 className="text-lg font-medium">
						{isArchived
							? t("policies.archive.restore_title")
							: t("policies.archive.title")}
					</h3>
					<p className="text-sm text-muted-foreground mt-1">{policy.name}</p>
				</div>
				{content}
			</DrawerContent>
		</Drawer>
	);
}
