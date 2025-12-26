'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const updateTrustPortalFaqMarkdownSchema = z.object({
  markdown: z
    .string()
    .max(50000, 'FAQ markdown must be less than 50,000 characters')
    .nullable()
    .optional()
    .transform((val) => (val === '' ? null : val ?? null)),
});

export const updateTrustPortalFaqMarkdownAction = authActionClient
  .inputSchema(updateTrustPortalFaqMarkdownSchema)
  .metadata({
    name: 'update-trust-portal-faq-markdown',
    track: {
      event: 'update-trust-portal-faq-markdown',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { markdown } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      throw new Error('No active organization');
    }

    try {
      const valueToSave = markdown === undefined || markdown === null || markdown === '' ? null : markdown;
      
      await db.organization.update({
        where: {
          id: activeOrganizationId,
        },
        data: {
          trustPortalFaqMarkdown: valueToSave,
        },
      });

      revalidatePath(`/${activeOrganizationId}/trust/portal-settings`);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error updating FAQ markdown:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update trust portal FAQ markdown';
      throw new Error(errorMessage);
    }
  });

