"use client";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
import { useDataTable } from "@/hooks/use-data-table";
import { useI18n } from "@/locales/client";
import type { Member, User, Vendor } from "@comp/db/types";
import { useQueryState } from "nuqs";
import { CreateVendorSheet } from "../../components/create-vendor-sheet";
import { columns } from "./VendorColumns";
import { useParams } from "next/navigation";
import React from "react";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";

export type VendorRegisterTableRow = Vendor & {
	assignee: {
		user: User;
	} | null;
};

export const VendorsTable = ({
	data,
	assignees,
}: {
	data: VendorRegisterTableRow[];
	assignees: (Member & { user: User })[];
}) => {
	const t = useI18n();
	const { orgId } = useParams();

	// Set up the vendors table
	const { table } = useDataTable({
		data,
		columns,
		pageCount: Math.ceil(data.length / 10),
		getRowId: (row) => row.id,
		initialState: {
			pagination: {
				pageSize: 10,
				pageIndex: 0,
			},
		},
		shallow: false,
		clearOnDefault: true,
	});

	return (
		<>
			<DataTable
				table={table}
				getRowId={(row) => row.id}
				rowClickBasePath={`/${orgId}/vendors`}
			>
				<DataTableToolbar
					table={table}
					sheet="createVendorSheet"
					action="Add Vendor"
				>
					<DataTableSortList table={table} align="end" />
				</DataTableToolbar>
			</DataTable>
			<CreateVendorSheet assignees={assignees} />
		</>
	);
};
