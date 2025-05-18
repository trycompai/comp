"use client";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
import { useDataTable } from "@/hooks/use-data-table";
import { useI18n } from "@/locales/client";
import { Card, CardContent, CardHeader, CardTitle } from "@comp/ui/card";
import { Input } from "@comp/ui/input";
import { ColumnDef } from "@tanstack/react-table";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { getFrameworkRequirements } from "../../lib/getFrameworkRequirements";
import type { FrameworkInstanceWithControls } from "../../types";

type RequirementItem = {
	id: string;
	compositeId: string;
	name: string;
	description: string;
	mappedControlsCount: number;
};

export function FrameworkRequirements({
	frameworkId,
	frameworkInstanceWithControls,
}: {
	frameworkId: string;
	frameworkInstanceWithControls: FrameworkInstanceWithControls;
}) {
	const t = useI18n();
	const { orgId, frameworkInstanceId } = useParams<{
		orgId: string;
		frameworkInstanceId: string;
	}>();
	const [searchTerm, setSearchTerm] = useState("");

	const requirements = useMemo(() => {
		const reqs = getFrameworkRequirements(frameworkId);
		return Object.entries(reqs).map(([id, requirement]) => {
			const compositeId = `${frameworkId}_${id}`;
			const mappedControlsCount =
				frameworkInstanceWithControls.controls.filter(
					(control) =>
						control.requirementsMapped?.some(
							(req) => req.requirementId === compositeId,
						) ?? false,
				).length;

			return {
				id,
				compositeId,
				...requirement,
				mappedControlsCount,
			};
		});
	}, [frameworkId, frameworkInstanceWithControls.controls]);

	// Define columns for requirements table
	const columns = useMemo<ColumnDef<RequirementItem>[]>(
		() => [
			{
				accessorKey: "id",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Name" />
				),
				cell: ({ row }) => <span>{row.original.name}</span>,
				enableSorting: true,
				size: 200,
				minSize: 150,
				maxSize: 250,
				enableResizing: true,
			},
			{
				accessorKey: "description",
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title="Description"
					/>
				),
				cell: ({ row }) => (
					<span className="block max-w-[500px]">
						{row.original.description}
					</span>
				),
				enableSorting: true,
				size: 500,
				minSize: 300,
				maxSize: 700,
				enableResizing: true,
			},
			{
				accessorKey: "mappedControlsCount",
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t("frameworks.controls.title")}
					/>
				),
				cell: ({ row }) => (
					<span className="text-sm text-muted-foreground">
						{row.original.mappedControlsCount}
					</span>
				),
				enableSorting: true,
				size: 150,
				minSize: 100,
				maxSize: 200,
				enableResizing: true,
			},
		],
		[t],
	);

	// Filter requirements data based on search term
	const filteredRequirements = useMemo(() => {
		if (!requirements?.length) return [];
		if (!searchTerm.trim()) return requirements;

		const searchLower = searchTerm.toLowerCase();
		return requirements.filter(
			(requirement) =>
				requirement.id.toLowerCase().includes(searchLower) ||
				requirement.name.toLowerCase().includes(searchLower) ||
				requirement.description.toLowerCase().includes(searchLower),
		);
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
	});

	if (!requirements?.length) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					{t("frameworks.requirements.requirements")} (
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
						<DataTableSortList table={table.table} align="end" />
					</div>
				</div>
				<DataTable
					table={table.table}
					rowClickBasePath={`/${orgId}/frameworks/${frameworkInstanceId}/requirements/`}
					getRowId={(row) => row.id}
				/>
			</CardContent>
		</Card>
	);
}
