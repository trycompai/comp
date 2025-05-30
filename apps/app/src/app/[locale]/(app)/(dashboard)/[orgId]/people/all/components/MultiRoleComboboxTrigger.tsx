"use client";

import * as React from "react";
import { Lock, X, ChevronsUpDown } from "lucide-react";
import type { Role } from "@prisma/client"; // Assuming Role is from prisma
import { Button } from "@comp/ui/button";
import { Badge } from "@comp/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@comp/ui/tooltip";
import { cn } from "@comp/ui/cn";

interface MultiRoleComboboxTriggerProps {
	selectedRoles: Role[];
	lockedRoles: Role[];
	triggerText: string;
	disabled?: boolean;
	handleSelect: (role: Role) => void; // For badge click to deselect/select
	getRoleLabel: (role: Role) => string;
	t: (key: string, options?: any) => string;
	onClick?: () => void;
	ariaExpanded?: boolean;
}

export function MultiRoleComboboxTrigger({
	selectedRoles,
	lockedRoles,
	triggerText,
	disabled,
	handleSelect,
	getRoleLabel,
	t,
	onClick,
	ariaExpanded,
}: MultiRoleComboboxTriggerProps) {
	return (
		<Button
			type="button"
			variant="outline"
			role="combobox"
			aria-expanded={ariaExpanded}
			className="w-full justify-between min-h-[40px] h-auto shadow-none"
			disabled={disabled}
			onClick={onClick}
		>
			<div className="flex flex-wrap gap-1 items-center">
				{selectedRoles.length === 0 && (
					<span className="text-muted-foreground text-sm">
						{triggerText}
					</span>
				)}
				{selectedRoles.map((role) => (
					<Badge
						key={role}
						variant="secondary"
						className={cn(
							"text-xs",
							lockedRoles.includes(role) && "border border-primary",
						)}
						onClick={(e) => {
							e.stopPropagation(); // Prevent popover from closing if it's open
							handleSelect(role);
						}}
					>
						{getRoleLabel(role)}
						{!lockedRoles.includes(role) ? (
							<X className="ml-1 h-3 w-3 cursor-pointer" />
						) : (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Lock className="ml-1 h-3 w-3 text-primary" />
									</TooltipTrigger>
									<TooltipContent>
										<p>
											{t(
												"people.member_actions.role_dialog.owner_note",
											)}
										</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)}
					</Badge>
				))}
			</div>
			<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
		</Button>
	);
}
