"use client";

import type { OrganizationControlRequirement } from "@bubba/db/types";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, XCircle } from "lucide-react";
import type { RequirementTableData } from "./ControlRequirementsTable";

export const ControlRequirementsTableColumns: ColumnDef<RequirementTableData>[] =
	[
		{
			id: "type",
			accessorKey: "type",
			header: "Type",
			cell: ({ row }) => row.original.type,
			size: 100,
		},
		{
			id: "description",
			accessorKey: "description",
			header: "Description",
			size: 1000,
			cell: ({ row }) => {
				const description = row.original.description || ""; // Default to empty string if null
				const maxLength = 300; // Increased character limit
				const displayText =
					description.length > maxLength
						? `${description.substring(0, maxLength)}...`
						: description;

				return (
					<div className="w-full pr-4" title={description}>
						{displayText}
					</div>
				);
			},
		},
		{
			id: "status",
			accessorKey: "organizationPolicy.status",
			header: "Status",
			size: 80,
			cell: ({ row }) => {
				const requirement = row.original;
				const isCompleted =
					requirement.type === "policy"
						? requirement.organizationPolicy?.status === "published"
						: requirement.type === "evidence"
							? requirement.organizationEvidence?.published
							: false;

				return (
					<div className="flex items-center justify-center">
						{isCompleted ? (
							<CheckCircle2 size={16} className="text-green-500" />
						) : (
							<XCircle size={16} className="text-red-500" />
						)}
					</div>
				);
			},
		},
	];
