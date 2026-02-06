'use client';

import { Comments } from '@/components/comments/Comments';
import { InherentRiskChart } from '@/components/risks/charts/InherentRiskChart';
import { ResidualRiskChart } from '@/components/risks/charts/ResidualRiskChart';
import { RiskOverview } from '@/components/risks/risk-overview';
import { TaskItems } from '@/components/task-items/TaskItems';
import { useRisk, type RiskResponse } from '@/hooks/use-risks';
import { CommentEntityType } from '@db';
import type { Member, Risk, User } from '@db';
import { PageHeader } from '@trycompai/design-system';
import { useMemo } from 'react';
import { RiskActions } from './RiskActions';

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
  taskItemId: string | null;
}

export function RiskPageClient({
  riskId,
  orgId,
  initialRisk,
  assignees,
  taskItemId,
}: RiskPageClientProps) {
  const { risk: swrRisk } = useRisk(riskId);
  const isViewingTask = Boolean(taskItemId);

  const risk = useMemo(() => {
    if (swrRisk) {
      return normalizeRisk(swrRisk);
    }
    return initialRisk;
  }, [swrRisk, initialRisk]);

  const shortTaskId = (id: string) => id.slice(-6).toUpperCase();

  const breadcrumbs = taskItemId
    ? [
        { label: 'Risks', href: `/${orgId}/risk` },
        { label: risk.title, href: `/${orgId}/risk/${riskId}` },
        { label: shortTaskId(taskItemId), isCurrent: true },
      ]
    : [
        { label: 'Risks', href: `/${orgId}/risk` },
        { label: risk.title, isCurrent: true },
      ];

  return (
    <>
      <PageHeader
        title={taskItemId ? shortTaskId(taskItemId) : risk.title}
        breadcrumbs={breadcrumbs}
        actions={<RiskActions riskId={riskId} orgId={orgId} />}
      />
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
        <TaskItems entityId={riskId} entityType="risk" />
        {!isViewingTask && (
          <Comments entityId={riskId} entityType={CommentEntityType.risk} organizationId={orgId} />
        )}
      </div>
    </>
  );
}

