"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@comp/ui/card";
import { Button } from "@comp/ui/button";
import { CreateCommentForm } from "./forms/create-comment-form";
import { useI18n } from "@/locales/client";
import { MessageSquarePlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@comp/ui/avatar";
import { Member, User } from "@comp/db/types";
import { cn } from "@comp/ui/cn";

interface Comment {
	id: string;
	content: string;
	authorId: string;
	createdAt: Date;
	author: Member & {
		user: User;
	};
}

interface CommentsProps {
	entityId: string;
	comments: Comment[];
}

export function Comments({ entityId, comments }: CommentsProps) {
	const [isAddingComment, setIsAddingComment] = useState(false);
	const t = useI18n();

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 border-b">
				<CardTitle>{t("common.comments.title")}</CardTitle>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setIsAddingComment(!isAddingComment)}
					className="gap-2"
				>
					<MessageSquarePlus className="h-4 w-4" />
					{t("common.comments.new")}
				</Button>
			</CardHeader>
			<CardContent className="pt-6">
				{isAddingComment && (
					<div className="mb-6">
						<CreateCommentForm entityId={entityId} />
					</div>
				)}
				<div className="space-y-6">
					{comments.map((comment, index) => (
						<div
							key={comment.id}
							className={cn(
								"space-y-3",
								index !== comments.length - 1 && "pb-6 border-b",
							)}
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<Avatar className="h-8 w-8">
										<AvatarImage
											src={comment.author.user.image || undefined}
											alt={comment.author.user.name || "User"}
										/>
										<AvatarFallback className="bg-primary/10">
											{comment.author.user.name?.charAt(0) || "?"}
										</AvatarFallback>
									</Avatar>
									<div className="flex flex-col">
										<span className="text-sm font-medium leading-none">
											{comment.author.user.name || "Unknown User"}
										</span>
										<span className="text-xs text-muted-foreground">
											{formatDistanceToNow(new Date(comment.createdAt), {
												addSuffix: true,
											})}
										</span>
									</div>
								</div>
							</div>
							<div className="pl-11">
								<p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
									{comment.content}
								</p>
							</div>
						</div>
					))}
					{comments.length === 0 && (
						<div className="text-center py-8">
							<p className="text-sm text-muted-foreground">
								{t("common.comments.empty.description")}
							</p>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
