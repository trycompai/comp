"use client";

import React, { useState } from "react";
import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useI18n } from "@/locales/client";
import { Avatar, AvatarFallback, AvatarImage } from "@comp/ui/avatar";
import { Badge } from "@comp/ui/badge";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@comp/ui/dropdown-menu";
import { Label } from "@comp/ui/label";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@comp/ui/alert-dialog";
import type { Role } from "@prisma/client";

import type { MemberWithUser } from "./TeamMembers";
import { MultiRoleCombobox } from "./MultiRoleCombobox";

interface MemberRowProps {
	member: MemberWithUser;
	onRemove: (memberId: string) => void;
	onUpdateRole: (memberId: string, roles: Role[]) => void;
}

// Helper to get initials
function getInitials(name?: string | null, email?: string | null): string {
	if (name) {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase();
	}
	if (email) {
		return email.substring(0, 2).toUpperCase();
	}
	return "??";
}

export function MemberRow({ member, onRemove, onUpdateRole }: MemberRowProps) {
	const t = useI18n();
	const params = useParams<{ locale: string; orgId: string }>();
	const { locale, orgId } = params;
	const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
	const [isRemoveAlertOpen, setIsRemoveAlertOpen] = useState(false);
	const [selectedRoles, setSelectedRoles] = useState<Role[]>(
		Array.isArray(member.role) ? member.role : ([member.role] as Role[]),
	);
	const [isUpdating, setIsUpdating] = useState(false);
	const [isRemoving, setIsRemoving] = useState(false);
	const currentUserIsOwner = member.role === "owner";

	const memberName = member.user.name || member.user.email || "Member";
	const memberEmail = member.user.email || "";
	const memberAvatar = member.user.image;
	const memberId = member.id;
	const currentRoles = (
		Array.isArray(member.role)
			? member.role
			: typeof member.role === "string" && member.role.includes(",")
				? (member.role.split(",") as Role[])
				: [member.role]
	) as Role[];

	const isOwner = currentRoles.includes("owner");
	const canEditRoles = true;
	const canRemove = !isOwner;

	const isEmployee = currentRoles.includes("employee");

	const handleUpdateRolesClick = async () => {
		let rolesToUpdate = selectedRoles;
		if (isOwner && !rolesToUpdate.includes("owner")) {
			rolesToUpdate = [...rolesToUpdate, "owner"];
		}

		// Don't update if no roles are selected
		if (rolesToUpdate.length === 0) {
			return;
		}

		setIsUpdating(true);
		await onUpdateRole(memberId, rolesToUpdate);
		setIsUpdating(false);
		setIsRoleDialogOpen(false);
	};

	const handleRemoveClick = async () => {
		if (!canRemove) return;
		setIsRemoving(true);
		await onRemove(memberId);
		setIsRemoving(false);
		setIsRemoveAlertOpen(false);
	};

	return (
		<>
			<div className="flex items-center justify-between p-4 hover:bg-muted/50">
				<div className="flex items-center gap-3">
					<Avatar>
						<AvatarImage src={memberAvatar || undefined} />
						<AvatarFallback>
							{getInitials(member.user.name, member.user.email)}
						</AvatarFallback>
					</Avatar>
					<div>
						<div className="flex items-center gap-2 font-medium">
							<span>{memberName}</span>
							{isEmployee && (
								<Link
									href={`/${locale}/${orgId}/people/${memberId}`}
									className="text-xs text-blue-600 hover:underline"
								>
									({t("people.member_actions.view_profile")})
								</Link>
							)}
						</div>
						<div className="text-sm text-muted-foreground">
							{memberEmail}
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
						{currentRoles.map((role) => (
							<Badge
								key={role}
								variant="secondary"
								className="text-xs"
							>
								{(() => {
									switch (role) {
										case "owner":
											return t("people.roles.owner");
										case "admin":
											return t("people.roles.admin");
										case "auditor":
											return t("people.roles.auditor");
										case "employee":
											return t("people.roles.employee");
										default:
											return "???";
									}
								})()}
							</Badge>
						))}
					</div>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="h-8 w-8 p-0"
								disabled={!canEditRoles}
							>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{canEditRoles && (
								<DropdownMenuItem
									onSelect={() => setIsRoleDialogOpen(true)}
								>
									<Edit className="mr-2 h-4 w-4" />
									<span>
										{t("people.member_actions.edit_roles")}
									</span>
								</DropdownMenuItem>
							)}
							{canRemove && (
								<DropdownMenuItem
									className="text-destructive focus:text-destructive focus:bg-destructive/10"
									onSelect={() => setIsRemoveAlertOpen(true)}
								>
									<Trash2 className="mr-2 h-4 w-4" />
									<span>
										{t(
											"people.member_actions.remove_member",
										)}
									</span>
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{t("people.member_actions.role_dialog.title_edit")}
						</DialogTitle>
						<DialogDescription>
							{t(
								"people.member_actions.role_dialog.description_prefix",
							)}{" "}
							{memberName}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor={`role-${memberId}`}>
								{t(
									"people.member_actions.role_dialog.role_label",
								)}
							</Label>
							<MultiRoleCombobox
								selectedRoles={selectedRoles}
								onSelectedRolesChange={setSelectedRoles}
								placeholder={t(
									"people.invite.role.placeholder",
								)}
								lockedRoles={isOwner ? ["owner"] : []}
							/>
							{isOwner && (
								<p className="text-xs text-muted-foreground mt-1">
									{t(
										"people.member_actions.role_dialog.owner_note",
									)}
								</p>
							)}
							<p className="text-xs text-muted-foreground mt-1">
								{t(
									"people.member_actions.role_dialog.at_least_one_role_note",
								)}
							</p>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsRoleDialogOpen(false)}
						>
							{t("common.actions.cancel")}
						</Button>
						<Button
							onClick={handleUpdateRolesClick}
							disabled={isUpdating || selectedRoles.length === 0}
						>
							{t("common.actions.update")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={isRemoveAlertOpen}
				onOpenChange={setIsRemoveAlertOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("people.member_actions.remove_confirm.title")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t(
								"people.member_actions.remove_confirm.description_prefix",
							)}{" "}
							{memberName}?{" "}
							{t(
								"people.member_actions.remove_confirm.description_suffix",
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>
							{t("common.actions.cancel")}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleRemoveClick}
							disabled={isRemoving}
						>
							{t("common.actions.remove")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
