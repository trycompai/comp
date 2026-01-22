'use server';

import { db, Impact, Likelihood } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { authActionClient } from '../safe-action';
import { updateResidualRiskSchema } from '../schema';

function mapNumericToImpact(value: number): Impact {
  if (value <= 2) return Impact.insignificant;
  if (value <= 4) return Impact.minor;
  if (value <= 6) return Impact.moderate;
  if (value <= 8) return Impact.major;
  return Impact.severe;
}

function mapNumericToLikelihood(value: number): Likelihood {
  if (value <= 2) return Likelihood.very_unlikely;
  if (value <= 4) return Likelihood.unlikely;
  if (value <= 6) return Likelihood.possible;
  if (value <= 8) return Likelihood.likely;
  return Likelihood.very_likely;
}

export const updateResidualRiskAction = authActionClient
  .inputSchema(updateResidualRiskSchema)
  .metadata({
    name: 'update-residual-risk',
    track: {
      event: 'update-residual-risk',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { id, probability, impact } = parsedInput;
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
          residualLikelihood: mapNumericToLikelihood(probability),
          residualImpact: mapNumericToImpact(impact),
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
      console.error('Error updating residual risk:', error);
      return {
        success: false,
      };
    }
  });
