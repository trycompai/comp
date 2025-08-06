'use server';

import { auth } from '@/utils/auth';
import { authClient } from '@/utils/auth-client';
import { getGT } from 'gt-next/server';
import { createSafeActionClient } from 'next-safe-action';
import { headers } from 'next/headers';
import { z } from 'zod';

const createSchemas = async () => {
  const t = await getGT();
  
  const emailSchema = z.string().email({ message: t('Invalid email format') });

  const schema = z.object({
    organizationId: z.string(),
    emails: z.array(emailSchema).min(1, { message: t('At least one email is required.') }),
  });

  return { emailSchema, schema };
};

interface InviteResult {
  email: string;
  success: boolean;
  error?: string;
}

export const bulkInviteEmployees = createSafeActionClient()
  .inputSchema(async () => {
    const { schema } = await createSchemas();
    return schema;
  })
  .action(async ({ parsedInput }) => {
    const { organizationId, emails } = parsedInput;
    const t = await getGT();

    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.session.activeOrganizationId !== organizationId) {
      return {
        success: false,
        error: t('Unauthorized or invalid organization.'),
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
        const errorMessage = error instanceof Error ? error.message : t('Invitation failed');
        results.push({ email, success: false, error: errorMessage });
      }
    }

    return { success: true, data: results };
  });
