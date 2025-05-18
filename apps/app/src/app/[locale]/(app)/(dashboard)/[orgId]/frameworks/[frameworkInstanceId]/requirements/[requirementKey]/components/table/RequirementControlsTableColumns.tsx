"use client";

import { isArtifactCompleted } from "@/app/[locale]/(app)/(dashboard)/[orgId]/lib/utils/control-compliance";
import { StatusIndicator } from "@/components/status-indicator";
import { useI18n } from "@/locales/client";
import type { Control } from "@comp/db/types";
import type { Artifact, Control as ControlType, Policy } from "@comp/db/types";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@comp/ui/tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getControlStatus } from "../../../../../lib/utils";
import type { Task } from "@comp/db/types";

type OrganizationControlType = Control & {
	artifacts: (Artifact & {
		policy: Policy | null;
	})[];
};

export function RequirementControlsTableColumns({
	tasks,
}: {
	tasks: (Task & { controls: Control[] })[];
}): ColumnDef<OrganizationControlType>[] {
	const t = useI18n();
	const { orgId } = useParams<{ orgId: string }>();

	return [
		{
			id: "name",
			accessorKey: "name",
			header: t("frameworks.controls.table.control"),
			cell: ({ row }) => {
				return (
					<div className="flex flex-col w-[300px]">
						<Link
							href={`/${orgId}/controls/${row.original.id}`}
							className="flex flex-col"
						>
							<span className="font-medium truncate">
								{row.original.name}
							</span>
						</Link>
					</div>
				);
			},
		},
		{
			id: "status",
			accessorKey: "artifacts",
			header: t("frameworks.controls.table.status"),
			cell: ({ row }) => {
				const artifacts = row.original.artifacts;
				const status = getControlStatus(
					artifacts,
					tasks,
					row.original.id,
				);

				const totalArtifacts = artifacts.length;
				const completedArtifacts =
					artifacts.filter(isArtifactCompleted).length;

				return (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="w-[200px]">
									<StatusIndicator status={status} />
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<div className="text-sm">
									<p>
										Progress:{" "}
										{Math.round(
											(completedArtifacts /
												totalArtifacts) *
												100,
										) || 0}
										%
									</p>
									<p>
										Completed: {completedArtifacts}/
										{totalArtifacts} artifacts
									</p>
								</div>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				);
			},
		},
	];
}
