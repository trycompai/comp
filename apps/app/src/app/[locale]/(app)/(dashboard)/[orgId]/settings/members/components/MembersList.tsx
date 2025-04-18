"use client";

import { removeMember } from "@/actions/organization/remove-member";
import { useI18n } from "@/locales/client";
import { authClient } from "@/utils/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@comp/ui/avatar";
import { Badge } from "@comp/ui/badge";
import { Button } from "@comp/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@comp/ui/card";
import {
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@comp/ui/dialog";
import { Dialog } from "@comp/ui/dialog";
import type { Member, Role, User } from "@prisma/client";
import { Crown, Trash2, UserCheck, UserCog, UserMinus } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
interface MembersListProps {
	members: (Member & { user: User })[];
}

export function MembersList({ members }: MembersListProps) {
	const t = useI18n();
	const { execute: executeRemoveMember } = useAction(removeMember);
	const currentUser = authClient.useSession();
	const currentUserId = currentUser.data?.session.userId;

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>{t("settings.team.members.title")}</CardTitle>
					<CardDescription>
						{t("settings.team.members.description")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{members.map((member) => {
							const isCurrentUser =
								member.userId === currentUserId;
							const isOwner = member.role === "owner";

							return (
								<div
									key={member.id}
									className="flex items-center justify-between p-4 border hover:bg-muted/50 transition-colors"
								>
									<div className="flex items-center gap-4">
										<Avatar>
											<AvatarImage
												src={
													member.user.image ||
													undefined
												}
											/>
											<AvatarFallback>
												{member.user.name
													? member.user.name
															.split(" ")
															.map((n) => n[0])
															.join("")
															.toUpperCase()
													: member.user.email
															?.slice(0, 2)
															.toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div>
											<div className="font-medium flex flex-col space-y-1">
												<span className="text-sm">
													{member.user.name ||
														member.user.email}{" "}
													<span className="text-xs text-muted-foreground">
														({member.user.email})
													</span>
												</span>
												<div className="flex flex-wrap gap-2 items-center">
													<Badge
														variant="marketing"
														className="w-fit"
													>
														{getMemberRoleIcon(
															member.role,
														)}
														{t(
															`settings.team.members.role.${member.role}`,
														)}
													</Badge>
												</div>
											</div>
										</div>
									</div>
									{!isCurrentUser && !isOwner && (
										<RemoveMemberConfirmation
											memberId={member.id}
											executeRemoveMember={(id) =>
												executeRemoveMember({
													memberId: id,
												})
											}
										/>
									)}
								</div>
							);
						})}
					</div>
				</CardContent>
				<CardFooter>
					{t("settings.team.members.description")}
				</CardFooter>
			</Card>
		</>
	);
}

function getMemberRoleIcon(role: Role) {
	switch (role) {
		case "owner":
			return <Crown className="h-3 w-3" />;
		case "admin":
			return <UserCog className="h-3 w-3" />;
		case "employee":
			return <UserCheck className="h-3 w-3" />;
		case "auditor":
			return <UserMinus className="h-3 w-3" />;
		default:
			return <UserCheck className="h-3 w-3" />;
	}
}

const RemoveMemberConfirmation = ({
	memberId,
	executeRemoveMember,
}: {
	memberId: string;
	executeRemoveMember: (memberId: string) => void;
}) => {
	const [open, setOpen] = useState(false);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="icon">
					<Trash2 className="h-4 w-4 text-red-400" />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Remove Member</DialogTitle>
				</DialogHeader>
				<DialogDescription>
					Are you sure you want to remove this member?
				</DialogDescription>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={() => {
							executeRemoveMember(memberId);
							setOpen(false);
						}}
					>
						Remove
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
