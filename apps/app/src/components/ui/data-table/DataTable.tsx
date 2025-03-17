"use client";

import {
	type Column,
	flexRender,
	getCoreRowModel,
	useReactTable,
	getSortedRowModel,
	type SortingState,
	type ColumnDef,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableRow } from "@bubba/ui/table";
import { cn } from "@bubba/ui/cn";
import { useState } from "react";
import { DataTableHeader } from "./DataTableHeader";
import { DataTablePagination } from "./DataTablePagination";
import { Input } from "@bubba/ui/input";
import { Button } from "@bubba/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuCheckboxItem,
} from "@bubba/ui/dropdown-menu";
import { Filter, Search, X } from "lucide-react";
import { DataTableSkeleton } from "./DataTableSkeleton";
import { Badge } from "@bubba/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@bubba/ui/avatar";

interface FilterItem {
	label: string;
	value: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	icon?: React.ReactNode;
}

interface FilterCategory {
	label: string;
	items: FilterItem[];
	maxHeight?: string;
}

interface DataTableProps<TData> {
	data: TData[];
	columns: ColumnDef<TData>[];
	onRowClick?: (row: TData) => void;
	className?: string;
	emptyMessage?: string;
	isLoading?: boolean;
	pagination?: {
		page: number;
		pageSize: number;
		totalCount: number;
		totalPages: number;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
	onPageChange?: (page: number) => void;
	onPageSizeChange?: (pageSize: number) => void;
	search?: {
		value: string;
		onChange: (value: string) => void;
		placeholder?: string;
	};
	filters?: {
		categories: FilterCategory[];
		hasActiveFilters: boolean;
		onClearFilters: () => void;
		activeFilterCount?: number;
	};
}

export function DataTable<TData>({
	data,
	columns,
	onRowClick,
	className,
	emptyMessage = "No data found.",
	isLoading = false,
	pagination,
	onPageChange,
	onPageSizeChange,
	search,
	filters,
}: DataTableProps<TData>) {
	const [sorting, setSorting] = useState<SortingState>([]);

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		enableColumnResizing: true,
		columnResizeMode: "onChange",
		defaultColumn: {
			minSize: 40,
			size: 150,
		},
		state: {
			sorting,
		},
		onSortingChange: setSorting,
	});

	return (
		<div className="space-y-4">
			{(search || filters) && (
				<div className="flex items-center gap-3">
					{search && (
						<div className="w-full max-w-md">
							<div className="relative">
								<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder={search.placeholder || "Search..."}
									value={search.value}
									onChange={(e) => search.onChange(e.target.value)}
									className="pl-8 pr-8"
								/>
								{search.value && (
									<Button
										variant="ghost"
										size="icon"
										className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
										onClick={() => search.onChange("")}
									>
										<X className="h-4 w-4 text-muted-foreground" />
									</Button>
								)}
							</div>
						</div>
					)}
					{filters && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className={cn(
										"h-9 px-3",
										filters.hasActiveFilters && "border-primary",
									)}
								>
									<Filter className="mr-2 h-4 w-4" />
									Filters
									{filters.hasActiveFilters && filters.activeFilterCount && (
										<Badge variant="secondary" className="ml-2 px-1 py-0">
											{filters.activeFilterCount}
										</Badge>
									)}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								className="w-[500px] max-w-[90vw]"
							>
								<div className="grid grid-cols-2 gap-4 p-2">
									{filters.categories.map((category, index) => (
										<div key={category.label}>
											<DropdownMenuLabel>{category.label}</DropdownMenuLabel>
											<div
												className={cn(
													"space-y-1",
													category.maxHeight && "overflow-y-auto",
													index < filters.categories.length - 1 && "mb-3",
												)}
												style={
													category.maxHeight
														? { maxHeight: category.maxHeight }
														: undefined
												}
											>
												{category.items.map((item) => (
													<DropdownMenuCheckboxItem
														key={item.value}
														checked={item.checked}
														onCheckedChange={item.onChange}
													>
														{item.icon ? (
															<div className="flex items-center gap-2">
																{item.icon}
																<span>{item.label}</span>
															</div>
														) : (
															item.label
														)}
													</DropdownMenuCheckboxItem>
												))}
											</div>
										</div>
									))}
								</div>

								{filters.hasActiveFilters && (
									<div className="px-2 pb-2">
										<DropdownMenuSeparator />
										<Button
											variant="ghost"
											size="sm"
											className="w-full justify-start text-sm font-normal mt-2"
											onClick={filters.onClearFilters}
										>
											Clear all filters
										</Button>
									</div>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			)}

			<div className={cn("relative w-full border", className)}>
				<div
					className="overflow-x-auto"
					style={{ WebkitOverflowScrolling: "touch" }}
				>
					<Table>
						<DataTableHeader table={table} />
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={columns.length} className="p-0">
										<DataTableSkeleton columns={columns.length} rows={5} />
									</TableCell>
								</TableRow>
							) : table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map((row) => (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && "selected"}
										className={cn(
											"hover:bg-muted/50",
											onRowClick && "cursor-pointer",
										)}
										onClick={() => onRowClick?.(row.original)}
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell
												key={cell.id}
												className="p-4 relative whitespace-nowrap"
												style={{ width: cell.column.getSize() }}
											>
												<div>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext(),
													)}
												</div>
												<div
													className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none bg-border opacity-0 hover:opacity-100 ${
														table.getState().columnSizingInfo
															.isResizingColumn === cell.column.id
															? "bg-primary opacity-100"
															: ""
													}`}
													onClick={(e) => {
														// Stop propagation to prevent row click when resizing
														e.stopPropagation();
													}}
												/>
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="h-24 text-center"
									>
										{emptyMessage}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>

			{pagination && onPageChange && onPageSizeChange && (
				<DataTablePagination
					{...pagination}
					onPageChange={onPageChange}
					onPageSizeChange={onPageSizeChange}
				/>
			)}
		</div>
	);
}
