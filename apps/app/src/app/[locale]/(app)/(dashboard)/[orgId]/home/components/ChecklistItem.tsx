"use client";

import { Button } from "@comp/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@comp/ui/card";
import { Badge } from "@comp/ui/badge";
import {
	CheckCircle,
	ArrowRight,
	Users,
	Plug,
	Building,
	Shield,
	Loader2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { updateOnboardingItem } from "../actions/updateOnboardingItem";
import type { ChecklistItemProps } from "../types/ChecklistProps.types";

const stepIcons = {
	team: Users,
	integrations: Plug,
	vendors: Building,
	risk: Shield,
	default: CheckCircle,
};

export function ChecklistItem({
	title,
	description,
	href,
	dbColumn,
	completed,
	buttonLabel,
}: ChecklistItemProps) {
	const { orgId } = useParams<{ orgId: string }>();
	const linkWithOrgReplaced = href.replace(":organizationId", orgId);
	const [isUpdating, setIsUpdating] = useState(false);
	const [isAnimating, setIsAnimating] = useState(false);

	const Icon =
		stepIcons[dbColumn as keyof typeof stepIcons] || stepIcons.default;

	const handleMarkAsDone = async () => {
		try {
			setIsUpdating(true);
			setIsAnimating(true);
			const result = await updateOnboardingItem(orgId, dbColumn, true);

			if (!result.success) {
				throw new Error(result.error);
			}

			setTimeout(() => setIsAnimating(false), 600);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to update status",
			);
		} finally {
			setIsUpdating(false);
		}
	};

	return (
		<Card
			className={`select-none relative overflow-hidden transition-all duration-300 ${
				completed
					? "border-green-200 bg-green-50/30 dark:bg-green-950/10 dark:border-green-900"
					: "hover:border-primary/50"
			} ${isAnimating ? "scale-[1.01]" : ""}`}
		>
			<div className={completed ? "opacity-80" : ""}>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div
								className={`flex h-10 w-10 items-center justify-center rounded-full ${
									completed
										? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
										: "bg-primary/10 text-primary"
								}`}
							>
								<Icon className="h-5 w-5" />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<CardTitle>{title}</CardTitle>
									{completed && (
										<Badge
											variant="outline"
											className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
										>
											Completed
										</Badge>
									)}
								</div>
								{description && (
									<CardDescription className="mt-1 text-sm text-muted-foreground">
										{description}
									</CardDescription>
								)}
							</div>
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-4 pt-0 sm:flex-row sm:items-center sm:justify-between">
					<Link href={linkWithOrgReplaced}>
						<Button
							variant={completed ? "outline" : "default"}
							size="sm"
							className="gap-1"
						>
							{buttonLabel}
							<ArrowRight className="ml-1 h-4 w-4" />
						</Button>
					</Link>
					<Button
						variant="outline"
						size="sm"
						disabled={completed || isUpdating}
						onClick={handleMarkAsDone}
						className="gap-1"
					>
						{completed ? (
							"Completed"
						) : isUpdating ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Updating...
							</>
						) : (
							"Mark as complete"
						)}
					</Button>
				</CardContent>
			</div>
		</Card>
	);
}
