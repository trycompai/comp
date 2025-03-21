"use client";

import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";

import { Table, TableBody, TableCell, TableRow } from "@bubba/ui/table";
import { ControlRequirementsTableColumns } from "./ControlRequirementsTableColumns";
import { ControlRequirementsTableHeader } from "./ControlRequirementsTableHeader";
import { useParams, useRouter } from "next/navigation";
import type {
	OrganizationControlRequirement,
	OrganizationEvidence,
	OrganizationPolicy,
} from "@bubba/db/types";

// Define the type that matches what we receive from the hook
export type RequirementTableData = OrganizationControlRequirement & {
	organizationPolicy: OrganizationPolicy | null;
	organizationEvidence: OrganizationEvidence | null;
};

interface DataTableProps {
	data: RequirementTableData[];
}

export function ControlRequirementsTable({ data }: DataTableProps) {
	const router = useRouter();
	const { orgId } = useParams<{ orgId: string }>();

	const table = useReactTable({
		data,
		columns: ControlRequirementsTableColumns,
		getCoreRowModel: getCoreRowModel(),
	});

	const onRowClick = (requirement: RequirementTableData) => {
		switch (requirement.type) {
			case "policy":
				if (requirement.organizationPolicyId) {
					router.push(
						`/${orgId}/policies/all/${requirement.organizationPolicyId}`,
					);
				}
				break;
			case "evidence":
				if (requirement.organizationEvidenceId) {
					router.push(
						`/${orgId}/evidence/${requirement.organizationEvidenceId}`,
					);
				}
				break;
			default:
				break;
		}
	};

	return (
		<div className="relative w-full">
			<div className="overflow-auto">
				<Table>
					<ControlRequirementsTableHeader table={table} />
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}
									className="hover:bg-muted/50 cursor-pointer"
									onClick={() => onRowClick(row.original)}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id} className="p-4">
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={ControlRequirementsTableColumns.length}
									className="h-24 text-center"
								>
									No requirements found.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
