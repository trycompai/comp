"use client";

import React, { useState } from "react";
import { Clock, MoreHorizontal, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@comp/ui/avatar";
import { Badge } from "@comp/ui/badge";
import { Button } from "@comp/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@comp/ui/dropdown-menu";
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
import { useI18n } from "@/locales/client";
import type { Invitation } from "@prisma/client";

interface PendingInvitationRowProps {
	invitation: Invitation;
	onCancel: (invitationId: string) => Promise<void>;
}

export function PendingInvitationRow({
	invitation,
	onCancel,
}: PendingInvitationRowProps) {
	const t = useI18n();
	const [isCancelling, setIsCancelling] = useState(false);
	const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);

	const handleCancelClick = async () => {
		setIsCancelling(true);
		await onCancel(invitation.id);
		setIsCancelling(false);
		setIsCancelAlertOpen(false);
	};

	// Process the role to handle comma-separated values
	const roles =
		typeof invitation.role === "string" && invitation.role.includes(",")
			? invitation.role.split(",")
			: Array.isArray(invitation.role)
				? invitation.role
				: [invitation.role];

	// Get the email initials for the avatar
	const emailInitials = invitation.email.substring(0, 2).toUpperCase();

	return (
		<>
			<div className="flex items-center justify-between p-4 hover:bg-muted/50">
				<div className="flex items-center gap-3">
					<Avatar>
						<AvatarFallback className="bg-amber-50 text-amber-700">
							{emailInitials}
						</AvatarFallback>
					</Avatar>
					<div>
						<div className="font-medium flex items-center gap-2">
							{invitation.email}
							<Badge variant="outline" className="text-xs">
								<Clock className="h-3 w-3 mr-1" />
								Pending
							</Badge>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
						{roles.map((role) => (
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
											return role;
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
							>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								className="text-destructive focus:text-destructive focus:bg-destructive/10"
								onSelect={() => setIsCancelAlertOpen(true)}
							>
								<Trash2 className="mr-2 h-4 w-4" />
								<span>Cancel Invitation</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<AlertDialog
				open={isCancelAlertOpen}
				onOpenChange={setIsCancelAlertOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to cancel the invitation for{" "}
							{invitation.email}?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Back</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleCancelClick}
							disabled={isCancelling}
						>
							Cancel Invitation
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
