"use client";

import { AssignedUser } from "@/components/assigned-user";
import { PolicyCommentSheet } from "@/components/sheets/policy-comment-sheet";
import { useI18n } from "@/locales/client";
import type { OrganizationPolicy, User } from "@bubba/db";
import { Button } from "@bubba/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { EmptyCard } from "@bubba/ui/empty-card";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";
import { useQueryState } from "nuqs";
import React from "react";

export function PolicyComment({
	policy,
	users,
}: {
	policy: OrganizationPolicy & { PolicyComments: any[] };
	users: User[];
}) {
	const [_, setOpen] = useQueryState("policy-comment-sheet");
	const t = useI18n();

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<div className="flex items-center justify-between gap-2">
						{t("common.comments.title")}
						<Button variant="action" onClick={() => setOpen("true")}>
							<MessageSquare className="h-4 w-4" />
							{t("common.comments.add")}
						</Button>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent>
				{policy.PolicyComments.length > 0 ? (
					<div className="flex flex-col gap-2">
						{policy.PolicyComments.map((comment) => (
							<div key={comment.id} className="flex flex-col gap-2 border p-4">
								<div className="flex items-center gap-2">{comment.content}</div>
								<div className="flex items-center gap-2">
									<div className="flex items-center gap-2">
										<AssignedUser
											fullName={
												users.find((user) => user.id === comment.ownerId)?.name
											}
											avatarUrl={
												users.find((user) => user.id === comment.ownerId)?.image
											}
										/>
										<span className="text-sm text-muted-foreground">
											({format(comment.createdAt, "MMM d, yyyy")})
										</span>
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<EmptyCard
						title={t("common.comments.empty.title")}
						icon={MessageSquare}
						description={t("common.comments.empty.description")}
						className="w-full"
					/>
				)}
			</CardContent>

			<PolicyCommentSheet policy={policy} />
		</Card>
	);
}
