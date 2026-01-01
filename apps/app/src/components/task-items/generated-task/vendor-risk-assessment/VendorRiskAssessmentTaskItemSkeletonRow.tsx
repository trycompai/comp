'use client';

import { Skeleton } from '@comp/ui/skeleton';
import { Loader2, TrendingUp, Circle } from 'lucide-react';

/**
 * Skeleton row shown while the system is generating the vendor Risk Assessment task.
 *
 * Intentionally non-interactive: users shouldn't open or edit the task until the
 * background job finishes and populates the structured description.
 *
 * Layout mirrors the actual TaskItemItem row for visual consistency.
 */
export function VendorRiskAssessmentTaskItemSkeletonRow() {
  return (
    <div className="flex items-center gap-2 p-4 rounded-lg border border-border bg-card opacity-60">
      <div className="flex-1 flex items-center gap-3 text-sm w-full">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Priority Icon - Fixed width (matches real row) */}
          <div className="w-8 shrink-0 flex items-center justify-center">
            <div className="h-6 px-1.5 rounded-md flex items-center justify-center bg-transparent text-pink-600 dark:text-pink-400">
              <TrendingUp className="h-4 w-4 stroke-[2]" />
            </div>
          </div>

          {/* Task ID - Fixed width (matches real row) */}
          <div className="w-14 shrink-0">
            <Skeleton className="h-3 w-12" />
          </div>

          {/* Status Icon - Fixed width (matches real row) */}
          <div className="w-8 shrink-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
          </div>

          {/* Title - Flexible with max width (matches real row) */}
          <div className="flex items-center gap-2 flex-1 min-w-0 max-w-[300px]">
            <h4 className="text-sm font-medium truncate">Risk Assessment</h4>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Assignee - Fixed width (matches real row) */}
          <div className="shrink-0 w-[180px]">
            <Skeleton className="h-6 w-full" />
          </div>

          {/* Date - Fixed width (matches real row) */}
          <div className="w-16 shrink-0 text-right">
            <Skeleton className="h-4 w-14 ml-auto" />
          </div>

          {/* Options Menu Placeholder - matches real row */}
          <div className="h-6 w-6 shrink-0" />
        </div>
      </div>
    </div>
  );
}


