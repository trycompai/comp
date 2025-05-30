"use client";

import * as React from "react";
import { Check } from "lucide-react";
import type { Role } from "@prisma/client"; // Assuming Role is from prisma
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@comp/ui/command";

import { cn } from "@comp/ui/cn";

interface MultiRoleComboboxContentProps {
	searchTerm: string;
	setSearchTerm: (value: string) => void;
	t: (key: string, options?: any) => string;
	filteredRoles: Array<{ value: Role }>; // Role objects, labels derived via t()
	handleSelect: (roleValue: Role) => void;
	lockedRoles: Role[];
	selectedRoles: Role[];
	onCloseDialog: () => void;
}

export function MultiRoleComboboxContent({
	searchTerm,
	setSearchTerm,
	t,
	filteredRoles,
	handleSelect,
	lockedRoles,
	selectedRoles,
	onCloseDialog,
}: MultiRoleComboboxContentProps) {
	const getRoleDisplayLabel = (roleValue: Role) => {
		switch (roleValue) {
			case "owner":
				return t("people.roles.owner");
			case "admin":
				return t("people.roles.admin");
			case "auditor":
				return t("people.roles.auditor");
			case "employee":
				return t("people.roles.employee");
			default:
				return roleValue;
		}
	};

	const getRoleDescription = (roleValue: Role) => {
		switch (roleValue) {
			case "owner":
				return t("people.roles.owner_description");
			case "admin":
				return t("people.roles.admin_description");
			case "auditor":
				return t("people.roles.auditor_description");
			case "employee":
				return t("people.roles.employee_description");
			default:
				return "";
		}
	};

	return (
		<Command>
			<CommandInput
				placeholder="Search..."
				value={searchTerm}
				onValueChange={setSearchTerm}
			/>
			<CommandList>
				<CommandEmpty>
					{t("people.empty.no_results.title")}
				</CommandEmpty>
				<CommandGroup>
					{filteredRoles.map((role) => (
						<CommandItem
							key={role.value}
							value={getRoleDisplayLabel(role.value)} // Use translated label for search/value
							onPointerDown={(e) => e.preventDefault()}
								onClick={(e) => e.stopPropagation()}
							onSelect={() => {
								handleSelect(role.value);
								onCloseDialog();
							}}
							disabled={
								role.value === "owner" || // Always disable the owner role
								(lockedRoles.includes(role.value) &&
									selectedRoles.includes(role.value)) // Disable any locked roles
							}
							className={cn(
								"flex flex-col items-start py-2 cursor-pointer",
								lockedRoles.includes(role.value) &&
									selectedRoles.includes(role.value) &&
									"bg-muted/50 text-muted-foreground",
							)}
						>
							<div className="flex w-full items-center">
								<Check
									className={cn(
										"mr-2 h-4 w-4 flex-shrink-0",
										selectedRoles.includes(role.value)
											? "opacity-100"
											: "opacity-0",
									)}
								/>
								<span className="flex-grow">
									{getRoleDisplayLabel(role.value)}
								</span>
								{lockedRoles.includes(role.value) &&
									selectedRoles.includes(role.value) && (
										<span className="ml-auto text-xs text-muted-foreground pl-2 flex-shrink-0">
											(Locked)
										</span>
									)}
							</div>
							<div className="ml-6 text-xs text-muted-foreground mt-1">
								{getRoleDescription(role.value)}
							</div>
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</Command>
	);
}
