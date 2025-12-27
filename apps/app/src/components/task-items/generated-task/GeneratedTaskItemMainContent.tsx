'use client';

import type { TaskItem } from '@/hooks/use-task-items';
import { isVendorRiskAssessmentTaskItem } from './vendor-risk-assessment/is-vendor-risk-assessment-task-item';
import { VendorRiskAssessmentTaskItemView } from './vendor-risk-assessment/VendorRiskAssessmentTaskItemView';

interface GeneratedTaskItemMainContentProps {
  taskItem: TaskItem;
}

/**
 * UI for system-generated tasks.
 *
 * Generated tasks are typically:
 * - read-only content (no inline edits)
 * - rendered from structured data stored in `taskItem.description`
 */
export function GeneratedTaskItemMainContent({ taskItem }: GeneratedTaskItemMainContentProps) {
  if (isVendorRiskAssessmentTaskItem(taskItem)) {
    return <VendorRiskAssessmentTaskItemView taskItem={taskItem} />;
  }

  // Future generated task types go here.
  return (
    <div className="text-sm text-muted-foreground italic">
      This is a generated task with no custom renderer yet.
    </div>
  );
}


