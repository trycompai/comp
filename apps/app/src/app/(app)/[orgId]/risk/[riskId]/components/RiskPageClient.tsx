'use client';

import { Comments } from '@/components/comments/Comments';
import { InherentRiskChart } from '@/components/risks/charts/InherentRiskChart';
import { ResidualRiskChart } from '@/components/risks/charts/ResidualRiskChart';
import { RiskOverview } from '@/components/risks/risk-overview';
import { TaskItems } from '@/components/task-items/TaskItems';
import { useRisk } from '@/hooks/use-risks';
import { CommentEntityType } from '@db';
import type { Member, Risk, User } from '@db';

type RiskWithAssignee = Risk & {
  assignee: { user: User } | null;
};

interface RiskPageClientProps {
  riskId: string;
  orgId: string;
  initialRisk: RiskWithAssignee;
  assignees: (Member & { user: User })[];
  isViewingTask: boolean;
}

/**
 * Client component for risk detail page content
 * Uses SWR for real-time updates and caching
 * 
 * Benefits:
 * - Instant initial render (uses server-fetched data)
 * - Background revalidation keeps data fresh
 * - Mutations trigger automatic refresh via mutate()
 */
export function RiskPageClient({
  riskId,
  orgId,
  initialRisk,
  assignees,
  isViewingTask,
}: RiskPageClientProps) {
  // Initialize SWR cache with this risk for shared cache across components
  // RiskActions and other components that use useRisk(riskId) will share this cache
  // When they call mutate(), it warms the cache for subsequent page loads
  useRisk(riskId, {
    organizationId: orgId,
    revalidateOnMount: false, // Don't fetch on mount - we have server data
    revalidateOnFocus: false,
  });

  // Use server-fetched risk for display
  // SWR cache is used by mutation components (RiskActions) for revalidation
  const risk = initialRisk;

  return (
    <div className="flex flex-col gap-4">
      {!isViewingTask && (
        <>
          <RiskOverview risk={risk} assignees={assignees} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InherentRiskChart risk={risk} />
            <ResidualRiskChart risk={risk} />
          </div>
        </>
      )}
      <TaskItems entityId={riskId} entityType="risk" organizationId={orgId} />
      {!isViewingTask && (
        <Comments entityId={riskId} entityType={CommentEntityType.risk} />
      )}
    </div>
  );
}

/**
 * Export the risk mutate function for use by mutation components
 * Call this after updating risk data to trigger SWR revalidation
 */
export { useRisk } from '@/hooks/use-risks';

