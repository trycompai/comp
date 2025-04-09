"use client";

import { Button } from "@comp/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@comp/ui/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { updateOnboardingItem } from "../actions/updateOnboardingItem";
import type { ChecklistItemProps } from "../types/ChecklistProps.types";

export function ChecklistItem({
	title,
	description,
	href,
	dbColumn,
	completed,
}: ChecklistItemProps) {
	const { orgId } = useParams<{ orgId: string }>();
	const linkWithOrgReplaced = href.replace(":organizationId", orgId);
	const [isUpdating, setIsUpdating] = useState(false);

	const handleMarkAsDone = async () => {
		try {
			setIsUpdating(true);
			const result = await updateOnboardingItem(orgId, dbColumn, true);

			if (!result.success) {
				throw new Error(result.error);
			}
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to update status",
			);
		} finally {
			setIsUpdating(false);
		}
	};

	return (
		<Card className="relative overflow-hidden">
			<div className={completed ? "blur-sm" : ""}>
				<CardHeader>
					<CardTitle>{title}</CardTitle>
					{description && <CardDescription>{description}</CardDescription>}
				</CardHeader>
				<CardContent className="flex items-center justify-between space-x-4">
					<Button asChild variant={completed ? "secondary" : "default"}>
						<Link href={linkWithOrgReplaced}>{title}</Link>
					</Button>

					<Button
						variant="outline"
						disabled={completed || isUpdating}
						onClick={handleMarkAsDone}
						className="min-w-[120px]"
					>
						{completed ? (
							"Done"
						) : isUpdating ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Updating...
							</>
						) : (
							"Mark as Done"
						)}
					</Button>
				</CardContent>
			</div>

			{completed && (
				<div className="absolute inset-0 flex items-center justify-center bg-background/50">
					<span className="text-xl font-semibold text-primary">Completed</span>
				</div>
			)}
		</Card>
	);
}
