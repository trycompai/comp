'use server';

import { db } from '@db';

export async function acceptPolicy(policyId: string, memberId: string) {
  try {
    // Add the member ID to the signedBy array if not already present
    const policy = await db.policy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    if (!policy.signedBy.includes(memberId)) {
      await db.policy.update({
        where: { id: policyId },
        data: {
          signedBy: {
            push: memberId,
          },
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error accepting policy:', error);
    return { success: false, error: 'Failed to accept policy' };
  }
}

export async function acceptAllPolicies(policyIds: string[], memberId: string) {
  try {
    // Update all policies to include the member ID in signedBy array
    const updatePromises = policyIds.map(async (policyId) => {
      const policy = await db.policy.findUnique({
        where: { id: policyId },
      });

      if (policy && !policy.signedBy.includes(memberId)) {
        return db.policy.update({
          where: { id: policyId },
          data: {
            signedBy: {
              push: memberId,
            },
          },
        });
      }
      return null;
    });

    await Promise.all(updatePromises);

    return { success: true };
  } catch (error) {
    console.error('Error accepting all policies:', error);
    return { success: false, error: 'Failed to accept all policies' };
  }
}
