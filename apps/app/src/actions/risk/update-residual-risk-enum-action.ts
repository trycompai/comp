'use server';

import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { authActionClient } from '../safe-action';
import { updateResidualRiskEnumSchema } from '../schema'; // Use the new enum schema

export const updateResidualRiskEnumAction = authActionClient
  .inputSchema(updateResidualRiskEnumSchema) // Use the new enum schema
  .metadata({
    name: 'update-residual-risk-enum', // New name
    track: {
      event: 'update-residual-risk', // Keep original event if desired
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { id, probability, impact } = parsedInput; // These are now enums
    const { session } = ctx;

    if (!session.activeOrganizationId) {
      throw new Error('Invalid organization');
    }

    try {
      await db.risk.update({
        where: {
          id,
          organizationId: session.activeOrganizationId,
        },
        data: {
          residualLikelihood: probability, // Use enum directly
          residualImpact: impact, // Use enum directly
        },
      });

      revalidatePath(`/${session.activeOrganizationId}/risk`);
      revalidatePath(`/${session.activeOrganizationId}/risk/register`);
      revalidatePath(`/${session.activeOrganizationId}/risk/${id}`);
      revalidateTag('risks', 'max');

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error updating residual risk (enum):', error);
      return {
        success: false,
      };
    }
  });
