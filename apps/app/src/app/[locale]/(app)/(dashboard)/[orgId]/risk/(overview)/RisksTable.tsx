"use client";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
import { CreateRiskSheet } from "@/components/sheets/create-risk-sheet";
import { useDataTable } from "@/hooks/use-data-table";
import { useI18n } from "@/locales/client";
import { useSession } from "@/utils/auth-client";
import type { Member, Risk, User } from "@comp/db/types";
import { ColumnDef } from "@tanstack/react-table";
import { useQueryState } from "nuqs";
import { useMemo } from "react";
import { columns as getColumns } from "./components/table/RiskColumns";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";

// Define the expected structure of a risk with User as assignee
export type RiskRow = Risk & { assignee: User | null };

export const RisksTable = ({
	risks,
	assignees,
}: {
	risks: RiskRow[];
	assignees: (Member & { user: User })[];
}) => {
	const t = useI18n();
	const session = useSession();
	const orgId = session?.data?.session?.activeOrganizationId;
	const [_, setOpen] = useQueryState("create-risk-sheet");

	// Define columns for risks table
	const columns = useMemo<ColumnDef<RiskRow>[]>(
		() => getColumns(orgId ?? ""),
		[orgId],
	);

	// Set up the risks table
	const table = useDataTable({
		data: risks,
		columns,
		pageCount: Math.ceil(risks.length / 10),
		getRowId: (row) => row.id,
		initialState: {
			pagination: {
				pageSize: 10,
				pageIndex: 0,
			},
		},
	});

	const [searchTerm, setSearchTerm] = useQueryState("search", {
		defaultValue: "",
	});

	return (
		<>
			<DataTable
				table={table.table}
				getRowId={(row) => row.id}
				rowClickBasePath={`/${orgId}/risk`}
			>
				<DataTableToolbar
					sheet="create-risk-sheet"
					action="Create Risk"
					table={table.table}
				>
					<DataTableSortList table={table.table} align="end" />
				</DataTableToolbar>
			</DataTable>
			<CreateRiskSheet assignees={assignees} />
		</>
	);
};
