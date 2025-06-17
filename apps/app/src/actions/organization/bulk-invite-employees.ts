'use server';

import { auth } from '@/utils/auth';
import { authClient } from '@/utils/auth-client';
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

    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.session.activeOrganizationId !== organizationId) {
      return {
        success: false,
        error: 'Unauthorized or invalid organization.',
      };
    }

    const results: InviteResult[] = [];
    let allSuccess = true;

    for (const email of emails) {
      try {
        await authClient.organization.inviteMember({
          email: email,
          role: 'employee',
        });
        results.push({ email, success: true });
      } catch (error) {
        allSuccess = false;
        console.error(`Failed to invite ${email}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Invitation failed';
        results.push({ email, success: false, error: errorMessage });
      }
    }

    return { success: true, data: results };
  });
