import { db } from '@db';

export async function getPublishedPoliciesScore(organizationId: string) {
  const allPolicies = await db.policy.findMany({
    where: {
      organizationId,
    },
  });

  const publishedPolicies = allPolicies.filter((p) => p.status === 'published');
  const draftPolicies = allPolicies.filter((p) => p.status === 'draft');
  const policiesInReview = allPolicies.filter((p) => p.status === 'needs_review');
  const unpublishedPolicies = allPolicies.filter(
    (p) => p.status === 'draft' || p.status === 'needs_review',
  );

  return {
    totalPolicies: allPolicies.length,
    publishedPolicies: publishedPolicies.length,
    draftPolicies,
    policiesInReview,
    unpublishedPolicies: unpublishedPolicies,
  };
}
