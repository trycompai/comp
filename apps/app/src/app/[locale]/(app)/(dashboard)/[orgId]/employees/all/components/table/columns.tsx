"use client";

import {
	EmployeeStatus,
	getEmployeeStatusFromBoolean,
} from "@/components/tables/people/employee-status";
import type { Member, User } from "@comp/db/types";
import { Avatar, AvatarFallback } from "@comp/ui/avatar";
import { Badge } from "@comp/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";

// Define a consistent type for employees with user data
export type EmployeeWithUser = Member & { user: User };

export const employeesColumns: ColumnDef<EmployeeWithUser>[] = [
	{
		accessorKey: "name",
		header: "Name",
		cell: ({ row }) => {
			const employee = row.original;

			return (
				<div className="flex items-center gap-2">
					<Avatar>
						<AvatarFallback>{employee.user.name[0] || "?"}</AvatarFallback>
					</Avatar>
					<div>
						<div className="font-medium">{employee.user.name}</div>
						<div className="text-sm text-muted-foreground">
							{employee.user.email}
						</div>
					</div>
				</div>
			);
		},
	},
	{
		accessorKey: "department",
		header: "Department",
		cell: ({ row }) => {
			const department = row.getValue("department") as string;
			return (
				<Badge variant="marketing" className="w-fit">
					{department.toUpperCase()}
				</Badge>
			);
		},
	},
	{
		accessorKey: "isActive",
		header: "Status",
		cell: ({ row }) => {
			const isActive = row.original.isActive;
			const status = getEmployeeStatusFromBoolean(isActive);

			return (
				<div className="hidden md:block">
					<EmployeeStatus status={status} />
				</div>
			);
		},
	},
];
