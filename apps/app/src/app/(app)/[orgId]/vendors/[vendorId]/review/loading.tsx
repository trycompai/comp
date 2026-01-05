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
      
      {/* Risk Assessment skeleton */}
      <div className="flex flex-col gap-6">
        {/* Header skeleton */}
        <div className="space-y-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Main content grid skeleton */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column - 2/3 width */}
          <div className="space-y-6 lg:col-span-2">
            {/* Security Assessment card */}
            <div className="rounded-lg border border-border bg-card p-6">
              <Skeleton className="h-5 w-40 mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>

            {/* Timeline card */}
            <div className="rounded-lg border border-border bg-card p-6">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </div>

          {/* Right column - 1/3 width */}
          <div className="space-y-6">
            {/* Useful Links card */}
            <div className="rounded-lg border border-border bg-card p-6">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>

            {/* Certifications card */}
            <div className="rounded-lg border border-border bg-card p-6">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>

            {/* Vendor Details card */}
            <div className="rounded-lg border border-border bg-card p-6">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

