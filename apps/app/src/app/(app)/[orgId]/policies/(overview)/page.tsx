import { auth } from '@/utils/auth';
import { db } from '@db';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Suspense } from 'react';
import { PolicyAssigneeChart } from './components/policy-assignee-chart';
import { PolicyStatusChart } from './components/policy-status-chart';
import Loading from './loading';

export default async function PoliciesOverview() {
  const overview = await getPoliciesOverview();

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PolicyStatusChart data={overview} />
          <PolicyAssigneeChart data={overview?.assigneeData} />
        </div>
      </div>
    </Suspense>
  );
}

const getPoliciesOverview = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session?.activeOrganizationId) {
    return null;
  }

  const organizationId = session.session.activeOrganizationId;

  return await db.$transaction(async (tx) => {
    const [
      totalPolicies,
      publishedPolicies,
      draftPolicies,
      archivedPolicies,
      needsReviewPolicies,
      policiesByAssignee,
      policiesByAssigneeStatus,
    ] = await Promise.all([
      tx.policy.count({
        where: {
          organizationId,
        },
      }),
      tx.policy.count({
        where: {
          organizationId,
          status: 'published',
          isArchived: false,
        },
      }),
      tx.policy.count({
        where: {
          organizationId,
          status: 'draft',
          isArchived: false,
        },
      }),
      tx.policy.count({
        where: {
          organizationId,
          isArchived: true,
        },
      }),
      tx.policy.count({
        where: {
          organizationId,
          status: 'needs_review',
          isArchived: false,
        },
      }),
      tx.policy.groupBy({
        by: ['assigneeId'],
        _count: true,
        where: {
          organizationId,
          assigneeId: { not: null },
        },
      }),
      tx.policy.findMany({
        where: {
          organizationId,
          assigneeId: { not: null },
        },
        select: {
          status: true,
          isArchived: true,
          assignee: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Transform the data for easier consumption by the chart component
    // First group by owner
    const policyDataByOwner = new Map();

    for (const policy of policiesByAssigneeStatus) {
      if (!policy.assignee) continue;

      const assigneeId = policy.assignee.id;
      if (!policyDataByOwner.has(assigneeId)) {
        policyDataByOwner.set(assigneeId, {
          id: assigneeId,
          name: policy.assignee.user.name || 'Unknown',
          total: 0,
          published: 0,
          draft: 0,
          archived: 0,
          needs_review: 0,
        });
      }

      const assigneeData = policyDataByOwner.get(assigneeId);
      assigneeData.total += 1;

      // Handle archived policies separately
      if (policy.isArchived) {
        assigneeData.archived += 1;
        continue;
      }

      // Handle each status type explicitly
      const status = policy.status;
      if (status === 'published') assigneeData.published += 1;
      else if (status === 'draft') assigneeData.draft += 1;
      else if (status === 'needs_review') assigneeData.needs_review += 1;
    }

    const assigneeData = Array.from(policyDataByOwner.values());

    return {
      totalPolicies,
      publishedPolicies,
      draftPolicies,
      archivedPolicies,
      needsReviewPolicies,
      policiesByAssignee,
      assigneeData,
    };
  });
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Policies',
  };
}
