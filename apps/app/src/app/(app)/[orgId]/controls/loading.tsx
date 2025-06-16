import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { Suspense } from "react";

export default function Loading() {
  return (
    <Suspense
      fallback={
        <DataTableSkeleton
          columnCount={3}
          filterCount={2}
          cellWidths={["10rem", "30rem", "10rem"]}
          shrinkZero
        />
      }
    />
  );
}
