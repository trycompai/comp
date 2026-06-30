import { db } from '@db';
import { logger, schemaTask, tags } from '@trigger.dev/sdk';
import { z } from 'zod';

import { mergeDuplicateUser } from './merge-duplicate-user';

export const migrateOrgEmailDomain = schemaTask({
  id: 'migrate-org-email-domain',
  schema: z.object({
    organizationId: z.string(),
    oldDomain: z.string().min(1),
    newDomain: z.string().min(1),
  }),
  run: async ({ organizationId, oldDomain, newDomain }) => {
    await tags.add([`org:${organizationId}`]);

    // Find all active members in the org with their user emails
    const members = await db.member.findMany({
      where: { organizationId, isActive: true, deactivated: false },
      select: {
        user: { select: { email: true } },
      },
    });

    const oldDomainSuffix = `@${oldDomain}`;
    const newDomainSuffix = `@${newDomain}`;

    // Build a set of new-domain emails for fast lookup
    const newDomainEmails = new Set(
      members
        .map((m) => m.user.email)
        .filter((email) => email.endsWith(newDomainSuffix)),
    );

    // Find members with old-domain email that have a matching new-domain counterpart
    const duplicatePairs = members
      .map((m) => m.user.email)
      .filter((email) => email.endsWith(oldDomainSuffix))
      .map((oldEmail) => {
        const username = oldEmail.slice(0, -oldDomainSuffix.length);
        const newEmail = `${username}${newDomainSuffix}`;
        return { oldEmail, newEmail };
      })
      .filter(({ newEmail }) => newDomainEmails.has(newEmail));

    if (duplicatePairs.length === 0) {
      logger.info('No duplicate email pairs found', { organizationId, oldDomain, newDomain });
      return { mergedCount: 0, pairs: [] };
    }

    logger.info(`Found ${duplicatePairs.length} duplicate pairs to merge`, {
      organizationId,
      pairs: duplicatePairs,
    });

    const results: Array<{ oldEmail: string; newEmail: string; ok: boolean; error?: string }> = [];

    for (const { oldEmail, newEmail } of duplicatePairs) {
      const result = await mergeDuplicateUser.triggerAndWait({
        organizationId,
        oldEmail,
        newEmail,
      });

      if (result.ok) {
        logger.info('Merged duplicate user', { oldEmail, newEmail });
        results.push({ oldEmail, newEmail, ok: true });
      } else {
        logger.error('Failed to merge duplicate user', { oldEmail, newEmail, error: result.error });
        results.push({ oldEmail, newEmail, ok: false, error: String(result.error) });
      }
    }

    const mergedCount = results.filter((r) => r.ok).length;
    const failedCount = results.filter((r) => !r.ok).length;

    logger.info('Domain migration complete', { organizationId, mergedCount, failedCount });

    return {
      mergedCount,
      failedCount,
      pairs: results,
    };
  },
});
