import { Skeleton } from '@comp/ui/skeleton';
import { Breadcrumb, PageHeader, PageLayout } from '@trycompai/design-system';

export default function NewRoleLoading() {
  return (
    <PageLayout>
      <Breadcrumb
        items={[
          { label: 'Roles', href: '#' },
          { label: 'Create Role', isCurrent: true },
        ]}
      />
      <PageHeader title="Create Custom Role" />
      <div className="rounded-lg border bg-card">
        <div className="border-b p-6">
          <Skeleton className="h-5 w-24 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="p-6 space-y-6">
          {/* Role Name field skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-3 w-72" />
          </div>

          {/* Permissions field skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-96" />
            <div className="rounded-lg border">
              <div className="grid grid-cols-[1fr_100px_100px_100px] gap-4 border-b bg-muted/50 p-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16 mx-auto" />
                <Skeleton className="h-4 w-12 mx-auto" />
                <Skeleton className="h-4 w-12 mx-auto" />
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_100px_100px] gap-4 border-b p-3 last:border-b-0">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 mx-auto rounded-full" />
                  <Skeleton className="h-4 w-4 mx-auto rounded-full" />
                  <Skeleton className="h-4 w-4 mx-auto rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Buttons skeleton */}
          <div className="flex justify-end gap-3 pt-4">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
