"use client";

import { changeOrganizationAction } from "@/actions/change-organization";
import { useI18n } from "@/locales/client";
import type { Organization } from "@comp/db/types";
import { Button } from "@comp/ui/button";
import { cn } from "@comp/ui/cn";
import { Dialog } from "@comp/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@comp/ui/dropdown-menu";
import { Plus } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateOrgModal } from "./modals/create-org-modal";
interface OrganizationSwitcherProps {
	organizations: Organization[];
	organization: Organization | null;
	isCollapsed?: boolean;
}

export function OrganizationSwitcher({
	organizations,
	organization,
	isCollapsed = false,
}: OrganizationSwitcherProps) {
	const t = useI18n();
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);
	const [showCreateOrg, setShowCreateOrg] = useState(false);

	const { execute, status } = useAction(changeOrganizationAction, {
		onSuccess: (result) => {
			const orgId = result.data?.data?.id;
			if (orgId) {
				router.push(`/${orgId}`);
				setIsOpen(false);
			}
		},
	});

	const currentOrganization = organization;

	const otherOrganizations = organizations.filter(
		(org) => org.id !== currentOrganization?.id,
	);

	const handleOrgChange = async (org: Organization) => {
		execute({ organizationId: org.id });
	};

	return (
		<div className="px-2 w-full">
			<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
				<DropdownMenuTrigger asChild disabled={status === "executing"}>
					<Button
						variant="ghost"
						className={cn(
							"flex items-center gap-2 transition-all m-2 w-full mx-auto",
							isCollapsed ? "h-9 w-9" : "h-9",
							status === "executing" &&
								"opacity-50 cursor-not-allowed",
						)}
					>
						<div className="h-8 w-8 shrink-0 flex items-center justify-center bg-muted">
							<span className="text-sm font-medium">
								{currentOrganization?.name
									?.slice(0, 2)
									.toUpperCase()}
							</span>
						</div>
						{!isCollapsed && (
							<span className="text-sm truncate mr-auto">
								{currentOrganization?.name}
							</span>
						)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-56">
					{otherOrganizations.map((org) => (
						<DropdownMenuItem
							key={org.id}
							onClick={() => handleOrgChange(org)}
							disabled={status === "executing"}
						>
							<div className="h-6 w-6 mr-2 bg-muted flex items-center justify-center flex-shrink-0">
								<span className="text-xs">
									{org.name?.slice(0, 2).toUpperCase()}
								</span>
							</div>
							<span className="truncate"> {org.name}</span>
						</DropdownMenuItem>
					))}
					{otherOrganizations.length > 0 && <DropdownMenuSeparator />}
					<DropdownMenuItem
						onClick={() => setShowCreateOrg(true)}
						className="cursor-pointer"
						disabled={status === "executing"}
					>
						<Plus className="mr-2 h-4 w-4" />
						{t("common.actions.create")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog
				open={showCreateOrg}
				onOpenChange={(open) => setShowCreateOrg(open)}
			>
				<CreateOrgModal
					onOpenChange={(open) => setShowCreateOrg(open)}
				/>
			</Dialog>
		</div>
	);
}
