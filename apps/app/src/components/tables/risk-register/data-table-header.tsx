"use client";

import { Button } from "@comp/ui/button";
import { TableHead, TableHeader, TableRow } from "@comp/ui/table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type Props = {
	table?: {
		getIsAllPageRowsSelected: () => boolean;
		getIsSomePageRowsSelected: () => boolean;
		getAllLeafColumns: () => {
			id: string;
			getIsVisible: () => boolean;
		}[];
		toggleAllPageRowsSelected: (value: boolean) => void;
	};
	loading?: boolean;
	isEmpty?: boolean;
};

export function DataTableHeader({ table, loading }: Props) {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const router = useRouter();
	const sortParam = searchParams.get("sort");
	const [column, value] = sortParam ? sortParam.split(":") : [];

	const createSortQuery = useCallback(
		(name: string) => {
			const params = new URLSearchParams(searchParams);
			const prevSort = params.get("sort");

			if (`${name}:asc` === prevSort) {
				params.set("sort", `${name}:desc`);
			} else if (`${name}:desc` === prevSort) {
				params.delete("sort");
			} else {
				params.set("sort", `${name}:asc`);
			}

			router.replace(`${pathname}?${params.toString()}`);
		},
		[searchParams, router, pathname],
	);

	const isVisible = (id: string) =>
		loading ||
		table
			?.getAllLeafColumns()
			.find((col) => col.id === id)
			?.getIsVisible();

	return (
		<TableHeader>
			<TableRow className="h-[45px] hover:bg-transparent">
				{isVisible("name") && (
					<TableHead className="min-w-[120px] px-3 md:px-4 py-2">
						<Button
							className="p-0 hover:bg-transparent space-x-2"
							variant="ghost"
							onClick={() => createSortQuery("title")}
						>
							<span>{"Risk"}</span>
							{"title" === column && value === "asc" && (
								<ArrowDown size={16} />
							)}
							{"title" === column && value === "desc" && (
								<ArrowUp size={16} />
							)}
						</Button>
					</TableHead>
				)}

				{isVisible("status") && (
					<TableHead className="min-w-[120px] px-3 md:px-4 py-2 hidden md:table-cell">
						<Button
							className="p-0 hover:bg-transparent space-x-2"
							variant="ghost"
							onClick={() => createSortQuery("status")}
						>
							<span>{"Status"}</span>
							{"status" === column && value === "asc" && (
								<ArrowDown size={16} />
							)}
							{"status" === column && value === "desc" && (
								<ArrowUp size={16} />
							)}
						</Button>
					</TableHead>
				)}

				{isVisible("department") && (
					<TableHead className="min-w-[120px] px-3 md:px-4 py-2 hidden md:table-cell">
						<Button
							className="p-0 hover:bg-transparent space-x-2"
							variant="ghost"
							onClick={() => createSortQuery("department")}
						>
							<span>{"Department"}</span>
							{"department" === column && value === "asc" && (
								<ArrowDown size={16} />
							)}
							{"department" === column && value === "desc" && (
								<ArrowUp size={16} />
							)}
						</Button>
					</TableHead>
				)}

				{isVisible("assigneeId") && (
					<TableHead className="min-w-[120px] px-3 md:px-4 py-2 hidden md:table-cell">
						<Button
							className="p-0 hover:bg-transparent space-x-2"
							variant="ghost"
							onClick={() => createSortQuery("assigneeId")}
						>
							<span>{"Assignee"}</span>
							{"assigneeId" === column && value === "asc" && (
								<ArrowDown size={16} />
							)}
							{"assigneeId" === column && value === "desc" && (
								<ArrowUp size={16} />
							)}
						</Button>
					</TableHead>
				)}
			</TableRow>
		</TableHeader>
	);
}
