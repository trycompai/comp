import { type Table as TanstackTable, flexRender } from "@tanstack/react-table";
import type * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { DataTablePagination } from "./data-table-pagination";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@comp/ui/table";
import { getCommonPinningStyles } from "@/lib/data-table";
import { cn } from "@comp/ui/cn";

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
	table: TanstackTable<TData>;
	actionBar?: React.ReactNode;
	getRowId?: (row: TData) => string;
}

export function DataTable<TData>({
	table,
	actionBar,
	children,
	className,
	getRowId,
	...props
}: DataTableProps<TData>) {
	const router = useRouter();
	const currentPath = usePathname();

	const handleRowClick = (row: TData) => {
		if (getRowId) {
			const id = getRowId(row);
			router.push(`${currentPath}/${id}`);
		}
	};

	return (
		<div
			className={cn("flex w-full flex-col gap-2.5 overflow-auto", className)}
			{...props}
		>
			{children}
			<div className="overflow-hidden">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header, index) => (
									<TableHead
										key={header.id}
										colSpan={header.colSpan}
										className={cn(
											index !== 0 && "hidden md:table-cell",
											index === 0 && "max-w-[200px] md:max-w-none",
										)}
										style={{
											...getCommonPinningStyles({ column: header.column }),
										}}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody className="[&_tr]:cursor-pointer">
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}
									className={cn(getRowId)}
									onClick={() => handleRowClick(row.original)}
								>
									{row.getVisibleCells().map((cell, index) => (
										<TableCell
											key={cell.id}
											className={cn(
												index !== 0 && "hidden md:table-cell",
												index === 0 &&
													"max-w-[200px] truncate md:max-w-none md:whitespace-normal [&_td]:hover:bg-accent/50",
											)}
											style={{
												...getCommonPinningStyles({ column: cell.column }),
											}}
										>
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
									colSpan={table.getAllColumns().length}
									className="h-24 text-center"
								>
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<div className="flex flex-col gap-2.5">
				<DataTablePagination table={table} />
				{actionBar &&
					table.getFilteredSelectedRowModel().rows.length > 0 &&
					actionBar}
			</div>
		</div>
	);
}
