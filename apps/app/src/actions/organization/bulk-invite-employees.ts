'use server';

import { maskEmailForLogs } from '@/lib/mask-email';
import { auth } from '@/utils/auth';
import { createSafeActionClient } from 'next-safe-action';
import { headers } from 'next/headers';
import { z } from 'zod';

const emailSchema = z.string().email({ message: 'Invalid email format' });

const schema = z.object({
  organizationId: z.string(),
  emails: z.array(emailSchema).min(1, { message: 'At least one email is required.' }),
});

interface InviteResult {
  email: string;
  success: boolean;
  error?: string;
}

export const bulkInviteEmployees = createSafeActionClient()
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    const { organizationId, emails } = parsedInput;
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.session.activeOrganizationId !== organizationId) {
      console.warn('[bulkInviteEmployees] unauthorized', { requestId, organizationId });
      return {
        success: false,
        error: 'Unauthorized or invalid organization.',
      };
    }

    const results: InviteResult[] = [];
    let allSuccess = true;

    console.info('[bulkInviteEmployees] start', {
      requestId,
      organizationId,
      count: emails.length,
    });

    for (const email of emails) {
      try {
        await auth.api.createInvitation({
          headers: await headers(),
          body: {
            email,
            role: 'employee',
            organizationId,
          },
        });
        results.push({ email, success: true });
      } catch (error) {
        allSuccess = false;
        console.error('[bulkInviteEmployees] invite failed', {
          requestId,
          organizationId,
          invitedEmail: maskEmailForLogs(email),
          error: error instanceof Error ? error.message : String(error),
        });
        const errorMessage = error instanceof Error ? error.message : 'Invitation failed';
        results.push({ email, success: false, error: errorMessage });
      }
    }

    console.info('[bulkInviteEmployees] complete', {
      requestId,
      organizationId,
      total: emails.length,
      successCount: results.filter((result) => result.success).length,
      failureCount: results.filter((result) => !result.success).length,
      durationMs: Date.now() - startTime,
    });

    return { success: true, data: results };
  });
