'use client';

import { Skeleton } from '@trycompai/design-system';
import { Locked, Time } from '@trycompai/design-system/icons';

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
              <Locked className="h-4 w-4" />
            </div>
          </div>

          {/* ID placeholder */}
          <div className="w-14 shrink-0">
            <div style={{ height: 12, width: 48 }}>
              <Skeleton />
            </div>
          </div>

          {/* Status indicator */}
          <div className="w-8 shrink-0 flex items-center justify-center">
            <Time className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Title */}
          <div className="flex items-center gap-2 flex-1 min-w-0 max-w-[300px]">
            <h4 className="text-sm font-medium truncate">Verify risk assessment</h4>
          </div>

          <div className="flex-1" />

          {/* Assignee placeholder */}
          <div className="shrink-0 w-[180px]">
            <div style={{ height: 24, width: '100%' }}>
              <Skeleton />
            </div>
          </div>

          {/* Date placeholder */}
          <div className="w-16 shrink-0 text-right">
            <div style={{ height: 16, width: 56, marginLeft: 'auto' }}>
              <Skeleton />
            </div>
          </div>

          <div className="h-6 w-6 shrink-0" />
        </div>
      </div>
    </div>
  );
}


