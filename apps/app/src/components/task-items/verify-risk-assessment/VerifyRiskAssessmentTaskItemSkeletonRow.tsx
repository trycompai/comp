'use client';

import { Skeleton } from '@comp/ui/skeleton';
import { Clock, Lock } from 'lucide-react';

/**
 * Disabled-looking row for the "Verify risk assessment" task while the
 * vendor risk assessment is still generating.
 *
 * This prevents users from opening/editing the task until the assessment exists.
 */
export function VerifyRiskAssessmentTaskItemSkeletonRow() {
  return (
    <div className="flex items-center gap-2 p-4 rounded-lg border border-border bg-card opacity-60">
      <div className="flex-1 flex items-center gap-3 text-sm w-full">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Priority icon placeholder */}
          <div className="w-8 shrink-0 flex items-center justify-center">
            <div className="h-6 px-1.5 rounded-md flex items-center justify-center bg-transparent text-muted-foreground">
              <Lock className="h-4 w-4 stroke-[2]" />
            </div>
          </div>

          {/* ID placeholder */}
          <div className="w-14 shrink-0">
            <Skeleton className="h-3 w-12" />
          </div>

          {/* Status indicator */}
          <div className="w-8 shrink-0 flex items-center justify-center">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Title */}
          <div className="flex items-center gap-2 flex-1 min-w-0 max-w-[300px]">
            <h4 className="text-sm font-medium truncate">Verify risk assessment</h4>
          </div>

          <div className="flex-1" />

          {/* Assignee placeholder */}
          <div className="shrink-0 w-[180px]">
            <Skeleton className="h-6 w-full" />
          </div>

          {/* Date placeholder */}
          <div className="w-16 shrink-0 text-right">
            <Skeleton className="h-4 w-14 ml-auto" />
          </div>

          <div className="h-6 w-6 shrink-0" />
        </div>
      </div>
    </div>
  );
}


