"use client";
import { AssignedUser } from "@/components/assigned-user";
import { StatusIndicator } from "@/components/status-indicator";
import { useI18n } from "@/locales/client";
import type { Departments, RiskStatus } from "@comp/db/types";
import { Badge } from "@comp/ui/badge";
import { Button } from "@comp/ui/button";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useParams } from "next/navigation";

export type RiskRegisterType = {
	id: string;
	title: string;
	status: RiskStatus;
	department?: Departments;
	assigneeId: string;
	assignee: {
		user: {
			image: string;
			name: string;
		};
	};
};

export function columns(): ColumnDef<RiskRegisterType>[] {
	const t = useI18n();
	const { orgId } = useParams<{ orgId: string }>();

	return [
		{
			id: "name",
			accessorKey: "name",
			header: t("risk.register.table.risk"),
			cell: ({ row }) => {
				const status = row.original.status;

				return (
					<div className="flex flex-col gap-1">
						<Button
							variant="link"
							className="p-0 justify-start"
							asChild
						>
							<Link href={`/${orgId}/risk/${row.original.id}`}>
								<span className="truncate">
									{row.original.title}
								</span>
							</Link>
						</Button>
						<div className="md:hidden">
							<StatusIndicator status={status} />
						</div>
					</div>
				);
			},
		},
		{
			id: "status",
			accessorKey: "status",
			header: () => (
				<span className="hidden md:table-cell">
					{t("common.table.status")}
				</span>
			),
			cell: ({ row }) => {
				const status = row.original.status;

				return (
					<div className="hidden md:flex items-center gap-2">
						<StatusIndicator status={status} />
					</div>
				);
			},
		},
		{
			id: "department",
			accessorKey: "department",
			header: () => (
				<span className="hidden md:table-cell">
					{t("common.filters.department")}
				</span>
			),
			cell: ({ row }) => {
				const department = row.original.department;

				if (!department) {
					return <span className="hidden md:table-cell">—</span>;
				}

				return (
					<span className="hidden md:table-cell">
						<Badge variant="marketing">
							{department.replace(/_/g, " ").toUpperCase()}
						</Badge>
					</span>
				);
			},
		},
		{
			id: "assigneeId",
			accessorKey: "assigneeId",
			header: () => (
				<span className="hidden md:table-cell">
					{t("common.assignee.label")}
				</span>
			),
			cell: ({ row }) => {
				return (
					<div className="hidden md:table-cell">
						<AssignedUser
							fullName={row.original.assignee?.user?.name}
							avatarUrl={row.original.assignee?.user?.image}
						/>
					</div>
				);
			},
		},
	];
}
