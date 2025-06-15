import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl">
      <DataTableSkeleton
        columnCount={3}
        filterCount={0}
        withViewOptions
        withPagination
      />
    </div>
  );
}
