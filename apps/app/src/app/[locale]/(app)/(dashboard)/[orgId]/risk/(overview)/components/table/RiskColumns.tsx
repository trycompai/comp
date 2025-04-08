import { Status } from "@/components/status";
import { Avatar, AvatarFallback, AvatarImage } from "@comp/ui/avatar";
import { Badge } from "@comp/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import { UserIcon } from "lucide-react";
import Link from "next/link";
import { RiskRow } from "../../RisksTable";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";

export const columns = (orgId: string): ColumnDef<RiskRow>[] => [
	{
		id: "title",
		accessorKey: "title",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Risk" />
		),
		cell: ({ row }) => {
			return (
				<Link href={`/${orgId}/risk/${row.original.id}`}>
					{row.original.title}
				</Link>
			);
		},
		meta: {
			label: "Risk",
			placeholder: "Search for a risk...",
			variant: "text",
		},
		enableColumnFilter: true,
		enableSorting: true,
	},
	{
		id: "status",
		accessorKey: "status",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Status" />
		),
		cell: ({ row }) => {
			return <Status status={row.original.status} />;
		},
		meta: {
			label: "Status",
		},
		enableColumnFilter: true,
		enableSorting: true,
	},
	{
		id: "department",
		accessorKey: "department",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Department" />
		),
		cell: ({ row }) => {
			return (
				<Badge variant="marketing" className="uppercase w-fit">
					{row.original.department}
				</Badge>
			);
		},
		meta: {
			label: "Department",
		},
		enableColumnFilter: true,
		enableSorting: true,
	},
	{
		id: "assignee",
		accessorKey: "assignee",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Assignee" />
		),
		cell: ({ row }) => {
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
							src={row.original.assignee.image || undefined}
							alt={row.original.assignee.name || ""}
						/>
						<AvatarFallback>
							{row.original.assignee.name?.charAt(0) || "?"}
						</AvatarFallback>
					</Avatar>
					<p className="text-sm font-medium">{row.original.assignee.name}</p>
				</div>
			);
		},
		meta: {
			label: "Assignee",
		},
		enableColumnFilter: true,
	},
];
