'use server';

import { authActionClient } from '@/actions/safe-action';
import { logger } from '@/utils/logger';
import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export const markPolicyAsCompleted = authActionClient
  .inputSchema(z.object({ policyId: z.string() }))
  .metadata({
    name: 'markPolicyAsCompleted',
    track: {
      event: 'markPolicyAsCompleted',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId } = parsedInput;
    const { user } = ctx;

    logger('markPolicyAsCompleted action started', {
      policyId,
      userId: user?.id,
    });

    if (!user) {
      logger('Unauthorized attempt to mark policy as completed', { policyId });
      throw new Error('Unauthorized');
    }

    const member = await db.member.findFirst({
      where: {
        userId: user.id,
        deactivated: false,
      },
    });

    if (!member) {
      logger('Member not found', { userId: user.id });
      throw new Error('Member not found');
    }

    const policy = await db.policy.findUnique({
      where: {
        id: policyId,
      },
    });

    if (!policy) {
      logger('Policy not found', { policyId });
      throw new Error('Policy not found');
    }

    // Check if user has already signed this policy
    if (policy.signedBy.includes(member.id)) {
      logger('User has already signed this policy', {
        policyId,
        memberId: member.id,
      });
      return policy;
    }

    logger('Updating policy signature', { policyId, memberId: member.id });
    const completedPolicy = await db.policy.update({
      where: { id: policyId },
      data: {
        signedBy: [...policy.signedBy, member.id],
      },
    });

    logger('Policy successfully marked as completed', {
      policyId,
      memberId: member.id,
    });

    revalidatePath('/');

    return completedPolicy;
  });
