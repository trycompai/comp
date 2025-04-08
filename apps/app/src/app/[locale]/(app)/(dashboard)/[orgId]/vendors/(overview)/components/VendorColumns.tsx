import { VendorStatus } from "@/components/vendor-status";
import { Avatar, AvatarFallback, AvatarImage } from "@comp/ui/avatar";
import { Badge } from "@comp/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import type { VendorRegisterTableRow } from "./VendorsTable";
import { UserIcon } from "lucide-react";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";

export const columns: ColumnDef<VendorRegisterTableRow>[] = [
	{
		id: "name",
		accessorKey: "name",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="Vendor Name" />;
		},
		cell: ({ row }) => {
			return (
				<Link
					href={`/${row.original.organizationId}/vendors/${row.original.id}`}
				>
					{row.original.name}
				</Link>
			);
		},
		meta: {
			label: "Vendor Name",
			placeholder: "Search for vendor name...",
			variant: "text",
		},
		enableColumnFilter: true,
	},
	{
		id: "status",
		accessorKey: "status",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="Status" />;
		},
		cell: ({ row }) => {
			return <VendorStatus status={row.original.status} />;
		},
		meta: {
			label: "Status",
			placeholder: "Search by status...",
			variant: "select",
		},
	},
	{
		id: "category",
		accessorKey: "category",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="Category" />;
		},
		cell: ({ row }) => {
			return (
				<Badge variant="marketing" className="uppercase w-fit">
					{row.original.category}
				</Badge>
			);
		},
		meta: {
			label: "Category",
			placeholder: "Search by category...",
			variant: "select",
		},
	},
	{
		id: "assignee",
		accessorKey: "assignee",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="Assignee" />;
		},
		cell: ({ row }) => {
			// Handle null assignee
			if (!row.original.assignee) {
				return (
					<div className="flex items-center gap-2">
						<div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted">
							<UserIcon className="h-4 w-4 text-muted-foreground" />
						</div>
						<p className="text-sm font-medium text-muted-foreground">None</p>
					</div>
				);
			}

			return (
				<div className="flex items-center gap-2">
					<Avatar className="h-8 w-8">
						<AvatarImage
							src={row.original.assignee.user.image || undefined}
							alt={row.original.assignee.user.name || ""}
						/>
						<AvatarFallback>
							{row.original.assignee.user.name?.charAt(0) || "?"}
						</AvatarFallback>
					</Avatar>
					<p className="text-sm font-medium">
						{row.original.assignee.user.name}
					</p>
				</div>
			);
		},
		meta: {
			label: "Assignee",
			placeholder: "Search by assignee...",
			variant: "select",
		},
	},
];
