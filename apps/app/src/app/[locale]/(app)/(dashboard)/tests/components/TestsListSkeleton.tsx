import { FilterToolbar } from "@/components/tables/tests/filter-toolbar";
import { Skeleton } from "@bubba/ui/skeleton";

export const TestsListSkeleton = () => {
  return (
    <div className="relative overflow-hidden">
      <FilterToolbar isEmpty={true} />
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-0.5 h-[53px]">
          <Skeleton className="h-full w-2/5" />
          <Skeleton className="h-full w-1/5" />
          <Skeleton className="h-full w-1/5" />
          <Skeleton className="h-full w-1/5" />
        </div>
        <div className="flex items-center gap-0.5 h-[37px]">
          <Skeleton className="h-full w-2/5" />
          <Skeleton className="h-full w-1/5" />
          <Skeleton className="h-full w-1/5" />
          <Skeleton className="h-full w-1/5" />
        </div>
        <div className="flex items-center gap-0.5 h-[37px]">
          <Skeleton className="h-full w-2/5" />
          <Skeleton className="h-full w-1/5" />
          <Skeleton className="h-full w-1/5" />
          <Skeleton className="h-full w-1/5" />
        </div>
        <div className="flex items-center gap-0.5 h-[37px]">
          <Skeleton className="h-full w-2/5" />
          <Skeleton className="h-full w-1/5" />
          <Skeleton className="h-full w-1/5" />
          <Skeleton className="h-full w-1/5" />
        </div>
      </div>
    </div>
  );
}; 