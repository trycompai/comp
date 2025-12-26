'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { faqArraySchema } from '../types/faq';

const updateTrustPortalFaqsSchema = z.object({
  faqs: faqArraySchema,
});

export const updateTrustPortalFaqsAction = authActionClient
  .inputSchema(updateTrustPortalFaqsSchema)
  .metadata({
    name: 'update-trust-portal-faqs',
    track: {
      event: 'update-trust-portal-faqs',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { faqs } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      throw new Error('No active organization');
    }

    // Normalize order values on the server to prevent gaps/duplicates and ensure stable rendering.
    const normalizedFaqs = faqs.map((faq, index) => ({
      ...faq,
      order: index,
    }));

    try {
      await db.organization.update({
        where: {
          id: activeOrganizationId,
        },
        data: {
          trustPortalFaqs:
            normalizedFaqs.length > 0
              ? (JSON.parse(JSON.stringify(normalizedFaqs)) as any)
              : (null as any),
        },
      });

      revalidatePath(`/${activeOrganizationId}/trust/portal-settings`);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error updating FAQs:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update FAQs';
      throw new Error(errorMessage);
    }
  });

