'use server';

import { appErrors } from '@/lib/errors';
import type { ActionResponse } from '@/types/actions';
import { db, Impact, Likelihood } from '@db';
import { createSafeActionClient } from 'next-safe-action';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const schema = z.object({
  vendorId: z.string(),
  residualProbability: z.nativeEnum(Likelihood),
  residualImpact: z.nativeEnum(Impact),
});

export const updateVendorResidualRisk = createSafeActionClient()
  .inputSchema(schema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      await db.vendor.update({
        where: { id: parsedInput.vendorId },
        data: {
          residualProbability: parsedInput.residualProbability,
          residualImpact: parsedInput.residualImpact,
        },
      });

      revalidatePath(`/vendors/${parsedInput.vendorId}`);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : appErrors.UNEXPECTED_ERROR,
      };
    }
  });
