'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { Skeleton } from '@comp/ui/skeleton';

export function VendorRiskAssessmentSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-10/12" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            <Skeleton className="h-4 w-24" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
            <div className="space-y-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`timeline-skeleton-${index}`} className="relative pl-6">
                  <div className="absolute left-[calc(0.5rem-6px)] top-[0.375rem] z-10 h-3 w-3 rounded-full border-2 border-border bg-background" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32 rounded-xl" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-10/12" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
