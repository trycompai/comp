"use client";

import { ColumnDef } from "@tanstack/react-table";
import { FrameworkEditorTaskTemplate } from "@prisma/client";
import { Button } from "@comp/ui/button";
import { PencilIcon, Trash2 } from "lucide-react";

export interface GetColumnsProps {
	onEditClick: (
		e: React.MouseEvent,
		task: FrameworkEditorTaskTemplate,
	) => void;
	onDeleteClick: (
		e: React.MouseEvent,
		task: FrameworkEditorTaskTemplate,
	) => void;
}

export function getColumns({
	onEditClick,
	onDeleteClick,
}: GetColumnsProps): ColumnDef<FrameworkEditorTaskTemplate>[] {
	return [
		{
			accessorKey: "name",
			header: "Name",
		},
		{
			accessorKey: "description",
			header: "Description",
		},
		{
			accessorKey: "frequency",
			header: "Frequency",
			cell: ({ row }) => {
				const value = row.getValue("frequency") as string;
				return value.charAt(0).toUpperCase() + value.slice(1);
			},
		},
		{
			accessorKey: "department",
			header: "Department",
			cell: ({ row }) => {
				const value = row.getValue("department") as string;
				return value.charAt(0).toUpperCase() + value.slice(1);
			},
		},
		{
			id: "actions",
			header: () => null,
			cell: ({ row }) => {
				const task = row.original;
				return (
					<div className="text-right pr-2 group h-full flex items-center justify-end gap-1">
						<Button
							variant="outline"
							size="icon"
							className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150"
							onClick={(e) => {
								e.stopPropagation();
								onEditClick(e, task);
							}}
							title="Edit Task"
						>
							<PencilIcon className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 text-destructive hover:text-destructive-foreground hover:bg-destructive"
							onClick={(e) => {
								e.stopPropagation();
								onDeleteClick(e, task);
							}}
							title="Delete Task"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				);
			},
			size: 100,
		},
	];
}
