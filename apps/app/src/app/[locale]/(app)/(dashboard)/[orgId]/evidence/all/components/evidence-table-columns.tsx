"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Evidence } from "@comp/db/types";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { StatusPolicies } from "@/components/status-policies";
import { formatDate } from "@/lib/format";
import { Badge } from "@comp/ui/badge";
import { calculateNextReview } from "@/lib/utils/calculate-next-review";

export function getEvidenceColumns(): ColumnDef<Evidence>[] {
	return [
		{
			id: "name",
			accessorKey: "name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Evidence" />
			),
			cell: ({ row }) => {
				return (
					<div className="flex items-center gap-2">
						<span className="max-w-[31.25rem] truncate font-medium">
							{row.getValue("name")}
						</span>
					</div>
				);
			},
			meta: {
				label: "Evidence",
				placeholder: "Search for evidence...",
				variant: "text",
			},
			enableColumnFilter: true,
		},
		{
			id: "status",
			accessorKey: "status",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Status" />
			),
			cell: ({ row }) => {
				return <StatusPolicies status={row.getValue("status")} />;
			},
			meta: {
				label: "Status",
				placeholder: "Search by status...",
				variant: "select",
			},
		},
		{
			id: "department",
			accessorKey: "department",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Department" />
			),
			cell: ({ row }) => {
				const department = row.original.department;

				if (!department || department === "none") {
					return (
						<Badge variant="marketing" className="text-xs w-min hidden md:flex">
							None
						</Badge>
					);
				}

				return (
					<div className="hidden md:flex items-center gap-2">
						<Badge variant="marketing">
							{department.replace(/_/g, " ").toUpperCase()}
						</Badge>
					</div>
				);
			},
			meta: {
				label: "Department",
				placeholder: "Search by department...",
				variant: "select",
			},
		},
		{
			id: "reviewDate",
			accessorKey: "reviewDate",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Review Date" />
			),
			cell: ({ row }) => {
				if (row.original.lastPublishedAt === null) {
					return (
						<div className="truncate text-red-500 font-medium hidden md:block">
							ASAP
						</div>
					);
				}

				const reviewInfo = calculateNextReview(
					row.original.lastPublishedAt,
					row.original.frequency,
				);

				if (!reviewInfo) return null;

				return (
					<div
						className={`truncate ${reviewInfo.isUrgent ? "text-red-500" : ""} hidden md:block`}
					>
						{reviewInfo.daysUntil} days ({formatDate(reviewInfo.nextReviewDate)}
						)
					</div>
				);
			},
			meta: {
				label: "Review Date",
				placeholder: "Search by review date...",
				variant: "date",
			},
		},
		{
			id: "updatedAt",
			accessorKey: "updatedAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Last Updated" />
			),
			cell: ({ row }) => {
				return (
					<div className="text-muted-foreground">
						{formatDate(row.getValue("updatedAt"))}
					</div>
				);
			},
			meta: {
				label: "Last Updated",
				placeholder: "Search by last updated...",
				variant: "date",
			},
		},
	];
}
