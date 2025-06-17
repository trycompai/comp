// create-risk-action.ts

'use server';

import { db } from '@comp/db';
import { Likelihood } from '@comp/db/types';
import { Impact } from '@comp/db/types';
import { revalidatePath, revalidateTag } from 'next/cache';
import { authActionClient } from '../safe-action';
import { createRiskSchema } from '../schema';

export const createRiskAction = authActionClient
  .inputSchema(createRiskSchema)
  .metadata({
    name: 'create-risk',
    track: {
      event: 'create-risk',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { title, description, category, department, assigneeId } = parsedInput;
    const { user, session } = ctx;

    if (!user.id || !session.activeOrganizationId) {
      throw new Error('Invalid user input');
    }

    try {
      await db.risk.create({
        data: {
          title,
          description,
          category,
          department,
          likelihood: Likelihood.very_unlikely,
          impact: Impact.insignificant,
          assigneeId: assigneeId,
          organizationId: session.activeOrganizationId,
        },
      });

      revalidatePath(`/${session.activeOrganizationId}/risk`);
      revalidatePath(`/${session.activeOrganizationId}/risk/register`);
      revalidateTag(`risk_${session.activeOrganizationId}`);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
      };
    }
  });
