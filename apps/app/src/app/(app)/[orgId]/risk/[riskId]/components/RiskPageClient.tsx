'use client';

import { Comments } from '@/components/comments/Comments';
import { InherentRiskChart } from '@/components/risks/charts/InherentRiskChart';
import { ResidualRiskChart } from '@/components/risks/charts/ResidualRiskChart';
import { RiskOverview } from '@/components/risks/risk-overview';
import { TaskItems } from '@/components/task-items/TaskItems';
import { useRisk, type RiskResponse } from '@/hooks/use-risks';
import { CommentEntityType } from '@db';
import type { Member, Risk, User } from '@db';
import { useMemo } from 'react';

type RiskWithAssignee = Risk & {
  assignee: { user: User } | null;
};

/**
 * Normalize API response to match Prisma types
 * API returns dates as strings, Prisma returns Date objects
 */
function normalizeRisk(apiRisk: RiskResponse): RiskWithAssignee {
  return {
    ...apiRisk,
    createdAt: new Date(apiRisk.createdAt),
    updatedAt: new Date(apiRisk.updatedAt),
    assignee: apiRisk.assignee
      ? {
          ...apiRisk.assignee,
          user: apiRisk.assignee.user as User,
        }
      : null,
  } as unknown as RiskWithAssignee;
}

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
 * - Real-time updates via polling (5s interval)
 * - Mutations trigger automatic refresh via mutate()
 */
export function RiskPageClient({
  riskId,
  orgId,
  initialRisk,
  assignees,
  isViewingTask,
}: RiskPageClientProps) {
  // Use SWR for real-time updates with polling
  const { risk: swrRisk, isLoading } = useRisk(riskId, {
    organizationId: orgId,
  });

  // Normalize and memoize the risk data
  // Use SWR data when available, fall back to initial data
  const risk = useMemo(() => {
    if (swrRisk) {
      return normalizeRisk(swrRisk);
    }
    return initialRisk;
  }, [swrRisk, initialRisk]);

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

