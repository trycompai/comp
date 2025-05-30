"use client";

import { changeOrganizationAction } from "@/actions/change-organization";
import { useI18n } from "@/locales/client";
import type { Organization, FrameworkEditorFramework } from "@comp/db/types";
import { Button } from "@comp/ui/button";
import { cn } from "@comp/ui/cn";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@comp/ui/dialog";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@comp/ui/command";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateOrgModal } from "./modals/create-org-modal";
import { useQueryState } from "nuqs";

interface OrganizationSwitcherProps {
	organizations: Organization[];
	organization: Organization | null;
	isCollapsed?: boolean;
	frameworks: Pick<
		FrameworkEditorFramework,
		"id" | "name" | "description" | "version" | "visible"
	>[];
}

interface OrganizationInitialsAvatarProps {
	name: string | null | undefined;
	isCollapsed?: boolean;
	className?: string;
}

const COLOR_PAIRS = [
	{
		bg: "bg-sky-100 dark:bg-sky-900/70",
		text: "text-sky-700 dark:text-sky-200",
	},
	{
		bg: "bg-blue-100 dark:bg-blue-900/70",
		text: "text-blue-700 dark:text-blue-200",
	},
	{
		bg: "bg-indigo-100 dark:bg-indigo-900/70",
		text: "text-indigo-700 dark:text-indigo-200",
	},
	{
		bg: "bg-purple-100 dark:bg-purple-900/70",
		text: "text-purple-700 dark:text-purple-200",
	},
	{
		bg: "bg-fuchsia-100 dark:bg-fuchsia-900/70",
		text: "text-fuchsia-700 dark:text-fuchsia-200",
	},
	{
		bg: "bg-pink-100 dark:bg-pink-900/70",
		text: "text-pink-700 dark:text-pink-200",
	},
	{
		bg: "bg-rose-100 dark:bg-rose-900/70",
		text: "text-rose-700 dark:text-rose-200",
	},
	{
		bg: "bg-red-100 dark:bg-red-900/70",
		text: "text-red-700 dark:text-red-200",
	},
	{
		bg: "bg-orange-100 dark:bg-orange-900/70",
		text: "text-orange-700 dark:text-orange-200",
	},
	{
		bg: "bg-amber-100 dark:bg-amber-900/70",
		text: "text-amber-700 dark:text-amber-200",
	},
	{
		bg: "bg-yellow-100 dark:bg-yellow-900/70",
		text: "text-yellow-700 dark:text-yellow-200",
	},
	{
		bg: "bg-lime-100 dark:bg-lime-900/70",
		text: "text-lime-700 dark:text-lime-200",
	},
	{
		bg: "bg-green-100 dark:bg-green-900/70",
		text: "text-green-700 dark:text-green-200",
	},
	{
		bg: "bg-emerald-100 dark:bg-emerald-900/70",
		text: "text-emerald-700 dark:text-emerald-200",
	},
	{
		bg: "bg-teal-100 dark:bg-teal-900/70",
		text: "text-teal-700 dark:text-teal-200",
	},
	{
		bg: "bg-cyan-100 dark:bg-cyan-900/70",
		text: "text-cyan-700 dark:text-cyan-200",
	},
];

function OrganizationInitialsAvatar({
	name,
	isCollapsed,
	className,
}: OrganizationInitialsAvatarProps) {
	const initials = name?.slice(0, 2).toUpperCase() || "";
	const sizeClasses = isCollapsed ? "h-8 w-8" : "h-8 w-8";
	const textSizeClass = isCollapsed ? "text-sm font-medium" : "text-xs";

	let colorIndex = 0;
	if (initials.length > 0) {
		const charCodeSum = Array.from(initials).reduce(
			(sum, char) => sum + char.charCodeAt(0),
			0,
		);
		colorIndex = charCodeSum % COLOR_PAIRS.length;
	}

	const selectedColorPair = COLOR_PAIRS[colorIndex] || COLOR_PAIRS[0];

	return (
		<div
			className={cn(
				"shrink-0 flex items-center justify-center rounded-sm",
				sizeClasses,
				selectedColorPair.bg,
				className,
			)}
		>
			<span className={cn(textSizeClass, selectedColorPair.text)}>
				{initials}
			</span>
		</div>
	);
}

export function OrganizationSwitcher({
	organizations,
	organization,
	isCollapsed = false,
	frameworks,
}: OrganizationSwitcherProps) {
	const t = useI18n();
	const router = useRouter();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [showCreateOrg, setShowCreateOrg] = useState(false);

	const [showOrganizationSwitcher, setShowOrganizationSwitcher] =
		useQueryState("showOrganizationSwitcher", {
			history: "push",
			parse: (value) => value === "true",
			serialize: (value) => value.toString(),
		});

	const { execute, status } = useAction(changeOrganizationAction, {
		onSuccess: (result) => {
			const orgId = result.data?.data?.id;
			if (orgId) {
				router.push(`/${orgId}/`);
				setIsDialogOpen(false);
			}
		},
	});

	const currentOrganization = organization;

	const handleOrgChange = async (org: Organization) => {
		execute({ organizationId: org.id });
	};

	return (
		<div className="w-full">
			<Dialog
				open={showOrganizationSwitcher ?? isDialogOpen}
				onOpenChange={(open) => {
					setShowOrganizationSwitcher(open);
					setIsDialogOpen(open);
				}}
			>
				<DialogTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-label={t("common.actions.selectOrg")}
						className={cn(
							"flex justify-between mx-auto rounded-md",
							isCollapsed ? "h-min w-min p-0" : "h-10 w-full p-0",
							status === "executing"
								? "opacity-50 cursor-not-allowed"
								: "",
						)}
						disabled={status === "executing"}
					>
						<OrganizationInitialsAvatar
							name={currentOrganization?.name}
							isCollapsed={isCollapsed}
							className={isCollapsed ? "" : "ml-1"}
						/>
						{!isCollapsed && (
							<span className="text-sm truncate mr-auto ml-2 relative flex items-center">
								{currentOrganization?.name}
							</span>
						)}
						{!isCollapsed && (
							<ChevronsUpDown className="ml-auto mr-2 h-4 w-4 shrink-0 opacity-50" />
						)}
					</Button>
				</DialogTrigger>
				<DialogContent className="p-0 sm:max-w-[400px]">
					<Command>
						<div className="flex items-center border-b px-3">
							<Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
							<CommandInput
								placeholder={t("common.placeholders.searchOrg")}
								className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
							/>
						</div>
						<CommandList>
							<CommandEmpty>
								{t("common.table.no_results")}
							</CommandEmpty>
							<CommandGroup className="max-h-[300px] overflow-y-auto">
								{organizations.map((org) => (
									<CommandItem
										key={org.id}
										value={org.name ?? org.id}
										onSelect={() => {
											if (
												org.id !==
												currentOrganization?.id
											) {
												handleOrgChange(org);
											} else {
												setIsDialogOpen(false);
											}
										}}
										disabled={status === "executing"}
									>
										<Check
											className={cn(
												"mr-2 h-4 w-4",
												currentOrganization?.id ===
													org.id
													? "opacity-100"
													: "opacity-0",
											)}
										/>
										<OrganizationInitialsAvatar
											name={org.name}
											isCollapsed={false}
											className="mr-2 h-6 w-6"
										/>
										<span className="truncate">
											{org.name}
										</span>
									</CommandItem>
								))}
							</CommandGroup>
							<CommandSeparator />
							<CommandGroup>
								<CommandItem
									onSelect={() => {
										setShowCreateOrg(true);
										setIsDialogOpen(false);
									}}
									className="cursor-pointer"
									disabled={status === "executing"}
								>
									<Plus className="mr-2 h-4 w-4" />
									{t("common.actions.createOrg")}
								</CommandItem>
							</CommandGroup>
						</CommandList>
					</Command>
				</DialogContent>
			</Dialog>
			<Dialog
				open={showCreateOrg}
				onOpenChange={(open) => setShowCreateOrg(open)}
			>
				<CreateOrgModal
					frameworks={frameworks}
					onOpenChange={(open) => setShowCreateOrg(open)}
				/>
			</Dialog>
		</div>
	);
}
