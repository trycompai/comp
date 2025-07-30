'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { z } from 'zod';

const isFriendlyAvailableSchema = z.object({
  friendlyUrl: z.string(),
  orgId: z.string(),
});

export const isFriendlyAvailable = authActionClient
  .inputSchema(isFriendlyAvailableSchema)
  .metadata({
    name: 'check-friendly-url',
    track: {
      event: 'check-friendly-url',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { friendlyUrl, orgId } = parsedInput;

    if (!ctx.session.activeOrganizationId) {
      throw new Error('No active organization');
    }

    const url = await db.trust.findUnique({
      where: {
        friendlyUrl,
      },
      select: {
        friendlyUrl: true,
        organizationId: true,
      },
    });

    if (url) {
      if (url.organizationId === orgId) {
        return { isAvailable: true };
      }
      return { isAvailable: false };
    }

    return { isAvailable: true };
  });
