import { Skeleton } from '@comp/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      {/* Vendor header skeleton */}
      <div className="mb-4 space-y-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-6 w-6 rounded-sm" />
        </div>
        <Skeleton className="h-4 w-96" />
      </div>
      
      {/* Tabs skeleton */}
      <nav className="pb-4 relative z-5 bg-background">
        <div className="flex items-center gap-2 overflow-auto p-[1px]">
          <div className="relative mb-0 w-full bg-card rounded-sm pb-2">
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-border/50" />
            <div className="relative flex items-center gap-2 px-2 pt-2">
              <Skeleton className="h-7 w-24 rounded-xs" />
              <Skeleton className="h-7 w-40 rounded-xs" />
            </div>
          </div>
        </div>
      </nav>
      
      {/* Content skeleton */}
      <div className="flex flex-col gap-4">
        {/* Secondary Fields skeleton */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-9 w-9 rounded-sm" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>

        {/* Tasks skeleton */}
        <div className="rounded-lg border border-border bg-card">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-9 w-9 rounded-sm" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
