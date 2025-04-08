import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";

export default function Loading() {
	return (
		<DataTableSkeleton
			columnCount={5}
			filterCount={2}
			cellWidths={["10rem", "30rem", "10rem", "10rem", "10rem"]}
			shrinkZero
		/>
	);
}
