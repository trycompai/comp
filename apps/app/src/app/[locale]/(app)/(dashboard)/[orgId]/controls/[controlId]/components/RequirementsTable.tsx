"use client";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
import { useDataTable } from "@/hooks/use-data-table";
import { useI18n } from "@/locales/client";
import type {
	FrameworkInstance,
	RequirementMap,
} from "@comp/db/types";
import { Card, CardContent, CardHeader, CardTitle } from "@comp/ui/card";
import { Input } from "@comp/ui/input";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { getFrameworkDetails } from "../../../frameworks/lib/getFrameworkDetails";
import { getRequirementDetails } from "../../../frameworks/lib/getRequirementDetails";

interface RequirementsTableProps {
	requirements: (RequirementMap & { frameworkInstance: FrameworkInstance })[];
	orgId: string;
}

export function RequirementsTable({
	requirements,
	orgId,
}: RequirementsTableProps) {
	const t = useI18n();
	const [searchTerm, setSearchTerm] = useState("");

	// Define columns for requirements table
	const columns = useMemo<
		ColumnDef<RequirementMap & { frameworkInstance: FrameworkInstance }>[]
	>(
		() => [
			{
				accessorKey: "id",
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t("frameworks.requirements.table.name")}
					/>
				),
				cell: ({ row }) => {
					const frameworkDetails = getFrameworkDetails(
						row.original.frameworkInstance.frameworkId,
					);

					return (
						<span>
							{frameworkDetails.name}
						</span>
					);
				},
				enableSorting: true,
				sortingFn: (rowA, rowB, columnId) => {
					const requirementIdA = rowA.original.requirementId;
					const requirementIdB = rowB.original.requirementId;

					const detailsA = getRequirementDetails(requirementIdA);
					const detailsB = getRequirementDetails(requirementIdB);

					const nameA = detailsA?.name || "";
					const nameB = detailsB?.name || "";

					return nameA.localeCompare(nameB);
				},
			},
			{
				accessorKey: "description",
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t("frameworks.requirements.table.description")}
					/>
				),
				cell: ({ row }) => {
					const requirementId = row.original.requirementId;
					const details = getRequirementDetails(requirementId);

					console.log("details", requirementId);	
					return (
						<span className="text-muted-foreground">
							{details?.description}
						</span>
					);
				},
				enableSorting: true,
				sortingFn: (rowA, rowB, columnId) => {
					const requirementIdA = rowA.original.requirementId;
					const requirementIdB = rowB.original.requirementId;

					const detailsA = getRequirementDetails(requirementIdA);
					const detailsB = getRequirementDetails(requirementIdB);

					const descA = detailsA?.description || "";
					const descB = detailsB?.description || "";

					return descA.localeCompare(descB);
				},
			},
		],
		[t],
	);

	// Filter requirements data based on search term
	const filteredRequirements = useMemo(() => {
		if (!searchTerm.trim()) return requirements;

		const searchLower = searchTerm.toLowerCase();
		return requirements.filter((req) => {
			const requirementId = req.requirementId;
			const details = getRequirementDetails(requirementId);

			// Search in ID, name, and description
			return (
				requirementId.toLowerCase().includes(searchLower) ||
				details?.name?.toLowerCase().includes(searchLower) ||
				details?.description?.toLowerCase().includes(searchLower)
			);
		});
	}, [requirements, searchTerm]);

	// Set up the requirements table
	const table = useDataTable({
		data: filteredRequirements,
		columns,
		pageCount: 1,
		shallow: false,
		getRowId: (row) => row.id,
		initialState: {
			sorting: [{ id: "id", desc: false }],
		},
		tableId: "r",
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					{t("frameworks.requirements.title")} (
					{filteredRequirements.length})
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex items-center mb-4">
					<Input
						placeholder={t(
							"frameworks.requirements.search.universal_placeholder",
						)}
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="max-w-sm"
					/>
					<div className="ml-auto">
						<DataTableSortList
							table={table.table}
							align="end"
							tableId="r"
						/>
					</div>
				</div>
				<DataTable
					table={table.table}
					rowClickBasePath={`/${orgId}/frameworks`}
					getRowId={(row) => {
						const requirementId = row.requirementId;
						return `${row.frameworkInstanceId}/requirements/${requirementId}`;
					}}
					tableId={"r"}
				/>
			</CardContent>
		</Card>
	);
}
