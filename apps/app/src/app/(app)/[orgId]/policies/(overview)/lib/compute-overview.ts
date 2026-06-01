// Shared utility - can be used by both server and client
import { isArchivedPolicy } from '../../lib/policy-archive-state';

interface PolicyForOverview {
  id: string;
  status: string;
  isArchived: boolean;
  archivedAt?: Date | string | null;
  assigneeId: string | null;
  assignee?: {
    id: string;
    user: {
      name: string | null;
    };
  } | null;
}

export interface AssigneeData {
  id: string;
  name: string;
  total: number;
  published: number;
  draft: number;
  archived: number;
  needs_review: number;
}

export interface PoliciesOverview {
  totalPolicies: number;
  publishedPolicies: number;
  draftPolicies: number;
  archivedPolicies: number;
  needsReviewPolicies: number;
  assigneeData: AssigneeData[];
}

/**
 * Compute overview stats from policies array
 * Pure function - works on both server and client
 */
export function computePoliciesOverview(policies: PolicyForOverview[]): PoliciesOverview {
  let publishedPolicies = 0;
  let draftPolicies = 0;
  let archivedPolicies = 0;
  let needsReviewPolicies = 0;

  const policyDataByOwner = new Map<string, AssigneeData>();

  for (const policy of policies) {
    const archived = isArchivedPolicy(policy);

    // Count by status
    if (archived) {
      archivedPolicies += 1;
    } else if (policy.status === 'published') {
      publishedPolicies += 1;
    } else if (policy.status === 'draft') {
      draftPolicies += 1;
    } else if (policy.status === 'needs_review') {
      needsReviewPolicies += 1;
    }

    // Group by assignee
    if (policy.assignee) {
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

      const assigneeData = policyDataByOwner.get(assigneeId)!;
      assigneeData.total += 1;

      if (archived) {
        assigneeData.archived += 1;
      } else if (policy.status === 'published') {
        assigneeData.published += 1;
      } else if (policy.status === 'draft') {
        assigneeData.draft += 1;
      } else if (policy.status === 'needs_review') {
        assigneeData.needs_review += 1;
      }
    }
  }

  return {
    totalPolicies: policies.length,
    publishedPolicies,
    draftPolicies,
    archivedPolicies,
    needsReviewPolicies,
    assigneeData: Array.from(policyDataByOwner.values()),
  };
}
