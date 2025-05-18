"use client";

import { useI18n } from "@/locales/client";
import { Task, Control } from "@comp/db/types";
import { Badge } from "@comp/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@comp/ui/card";
import { cn } from "@comp/ui/cn";
import { ClipboardCheck, ClipboardList, Clock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getFrameworkDetails } from "../lib/getFrameworkDetails";
import { FrameworkInstanceWithControls } from "../types";

interface FrameworkCardProps {
	frameworkInstance: FrameworkInstanceWithControls;
	complianceScore: number;
	tasks: (Task & { controls: Control[] })[];
}

export function FrameworkCard({
	frameworkInstance,
	complianceScore,
	tasks,
}: FrameworkCardProps) {
	const { orgId } = useParams<{ orgId: string }>();
	const t = useI18n();

	const getComplianceColor = (score: number) => {
		if (score >= 80) return "text-green-500";
		if (score >= 50) return "text-yellow-500";
		return "text-red-500";
	};

	const getComplianceProgressColor = (score: number) => {
		if (score >= 80) return "bg-green-500";
		if (score >= 50) return "bg-yellow-500";
		return "bg-red-500";
	};

	const getStatusBadge = (score: number) => {
		if (score >= 95)
			return {
				label: t("common.status.compliant"),
				color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
			};
		if (score >= 80)
			return {
				label: "Nearly Compliant",
				color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
			};
		if (score >= 50)
			return {
				label: t("common.status.in_progress"),
				color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
			};
		return {
			label: "Needs Attention",
			color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
		};
	};

	const controlsCount = frameworkInstance.controls?.length || 0;
	const compliantControlsCount = Math.round(
		(complianceScore / 100) * controlsCount,
	);

	// Calculate not started controls: controls where all artifacts are draft or non-existent AND all tasks are todo or non-existent
	const notStartedControlsCount =
		frameworkInstance.controls?.filter((control) => {
			// If a control has no artifacts and no tasks, it's not started.
			const controlTasks = tasks.filter((task) =>
				task.controls.some((c) => c.id === control.id),
			);

			if (
				(!control.artifacts || control.artifacts.length === 0) &&
				controlTasks.length === 0
			) {
				return true;
			}

			// Check if ALL artifacts are in draft state or non-existent
			const artifactsNotStarted =
				!control.artifacts ||
				control.artifacts.length === 0 ||
				control.artifacts.every((artifact) => {
					const isPolicyDraft =
						!artifact.policy || artifact.policy.status === "draft";
					return isPolicyDraft;
				});

			// Check if ALL tasks are in todo state or there are no tasks
			const tasksNotStarted =
				controlTasks.length === 0 ||
				controlTasks.every((task) => task.status === "todo");

			return artifactsNotStarted && tasksNotStarted;
			// If either any artifact is not draft or any task is not todo, it's in progress
		}).length || 0;

	// Calculate in progress controls: Total - Compliant - Not Started
	const inProgressCount = Math.max(
		0, // Ensure count doesn't go below zero
		controlsCount - compliantControlsCount - notStartedControlsCount,
	);

	const frameworkDetails = getFrameworkDetails(frameworkInstance.frameworkId);
	const statusBadge = getStatusBadge(complianceScore);

	// Calculate last activity date - use current date as fallback
	const lastActivityDate = new Date().toLocaleDateString();

	return (
		<Link
			href={`/${orgId}/frameworks/${frameworkInstance.id}`}
			className="block"
		>
			<Card className="select-none hover:bg-muted/40 transition-colors duration-200 overflow-hidden h-full flex flex-col">
				<CardHeader className="flex-shrink-0">
					<CardTitle className="flex items-center">
						{frameworkDetails.name}
						<Badge
							variant="outline"
							className="ml-2 text-xs font-normal"
						>
							{frameworkDetails.version}
						</Badge>
					</CardTitle>
					<CardDescription>
						<div className="flex items-start justify-between gap-2">
							<p className="text-sm text-muted-foreground line-clamp-2">
								{frameworkDetails.description}
							</p>
							<Badge
								className={cn(
									"hidden md:block",
									statusBadge.color,
								)}
							>
								{statusBadge.label}
							</Badge>
						</div>
					</CardDescription>
				</CardHeader>
				<CardContent className="flex-grow flex flex-col gap-4">
					<div className="flex flex-col gap-3">
						<div className="space-y-1.5">
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">
									{t("common.status.title")}
								</span>
								<span
									className={cn(
										"font-medium",
										getComplianceColor(complianceScore),
									)}
								>
									{complianceScore}%
								</span>
							</div>
							<div className="relative h-2 w-full bg-secondary overflow-hidden">
								<div
									className={cn(
										"h-full transition-all",
										getComplianceProgressColor(
											complianceScore,
										),
									)}
									style={{ width: `${complianceScore}%` }}
								/>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4 mt-1">
						<div className="flex flex-col items-start gap-1 border-r pr-3">
							<div className="flex items-center text-muted-foreground">
								<ClipboardList className="h-3.5 w-3.5 mr-1" />
								<span className="text-xs">
									{t("frameworks.controls.title")}
								</span>
							</div>
							<p className="font-medium text-sm">
								{controlsCount} {t("tasks.items")}
							</p>
						</div>
						<div className="flex flex-col items-start gap-1 border-r pr-3">
							<div className="flex items-center text-muted-foreground">
								<ClipboardCheck className="h-3.5 w-3.5 mr-1" />
								<span className="text-xs">
									{t(
										"frameworks.controls.statuses.completed",
									)}
								</span>
							</div>
							<p className="font-medium text-sm">
								{compliantControlsCount} / {controlsCount}
							</p>
						</div>
						<div className="flex flex-col items-start gap-1">
							<div className="flex items-center text-muted-foreground">
								<Clock className="h-3.5 w-3.5 mr-1" />
								<span className="text-xs">
									{t(
										"frameworks.controls.statuses.in_progress",
									)}
								</span>
							</div>
							<p className="font-medium text-sm">
								{inProgressCount} / {controlsCount}
							</p>
						</div>
					</div>
				</CardContent>
				<CardFooter className="text-xs text-muted-foreground flex justify-between mt-auto flex-shrink-0">
					<div className="flex items-center">
						<Clock className="h-3.5 w-3.5 mr-1.5" />
						{t("common.last_updated")}: {lastActivityDate}
					</div>
				</CardFooter>
			</Card>
		</Link>
	);
}
