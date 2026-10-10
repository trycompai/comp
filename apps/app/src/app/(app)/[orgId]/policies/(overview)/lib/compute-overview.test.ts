import { describe, expect, it } from 'vitest';
import { computePoliciesOverview } from './compute-overview';

const assignee = { id: 'mem-1', user: { name: 'Alice' } };

describe('computePoliciesOverview', () => {
  it('counts a published policy with a new version pending approval as published', () => {
    const overview = computePoliciesOverview([
      { id: 'p1', status: 'published', lastPublishedAt: '2026-01-01', isArchived: false, assigneeId: 'mem-1', assignee },
      { id: 'p2', status: 'needs_review', lastPublishedAt: '2026-01-01', isArchived: false, assigneeId: 'mem-1', assignee },
      { id: 'p3', status: 'needs_review', lastPublishedAt: null, isArchived: false, assigneeId: 'mem-1', assignee },
    ]);

    expect(overview.publishedPolicies).toBe(2);
    expect(overview.needsReviewPolicies).toBe(1);
    expect(overview.assigneeData[0]).toMatchObject({ published: 2, needs_review: 1 });
  });
});
