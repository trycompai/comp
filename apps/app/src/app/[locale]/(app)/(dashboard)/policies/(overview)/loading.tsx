import { Skeleton } from "@bubba/ui/skeleton";

export default function PoliciesOverviewLoading() {
  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Skeleton className="h-[200px] w-full" />
      </div>
    </div>
  );
}
