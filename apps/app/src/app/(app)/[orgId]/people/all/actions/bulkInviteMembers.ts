'use server';

import { auth } from '@/utils/auth'; // Import main auth
import { authClient } from '@/utils/auth-client';
import { getGT } from 'gt-next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers'; // Import headers
import { z } from 'zod';
// Import common types from the new actions directory structure
import type { ActionResponse } from '@/actions/types';

// --- Schemas for Validation ---
const getEmailSchema = (t: Awaited<ReturnType<typeof getGT>>) =>
  z.string().email(t('Invalid email format'));
const availableRoles = ['admin', 'auditor', 'employee'] as const;
type InviteRole = (typeof availableRoles)[number];
const DEFAULT_ROLE: InviteRole = 'employee'; // Define default role here too

const getManualInviteSchema = (t: Awaited<ReturnType<typeof getGT>>) =>
  z.object({
    email: getEmailSchema(t),
    role: z.enum(availableRoles),
  });
const getManualInvitesSchema = (t: Awaited<ReturnType<typeof getGT>>) =>
  z.array(getManualInviteSchema(t));

// --- Result Type ---
interface BulkInviteResult {
  successfulInvites: number;
  failedItems: {
    input: string | { email: string; role: InviteRole };
    error: string;
  }[];
}

// --- Server Action (Accepts FormData) ---
export async function bulkInviteMembers(
  formData: FormData,
): Promise<ActionResponse<BulkInviteResult>> {
  const t = await getGT();

  // Manually get session and check auth
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.session) {
    return { success: false, error: t('Authentication required.') };
  }
  const organizationId = session.session.activeOrganizationId;
  const userId = session.session.userId;

  if (!organizationId) {
    return { success: false, error: t('Organization not found') };
  }

  const results: BulkInviteResult = {
    successfulInvites: 0,
    failedItems: [],
  };

  const submissionType = formData.get('type') as string;

  try {
    if (submissionType === 'csv') {
      const file = formData.get('csvFile') as File | null;
      if (!file || !(file instanceof File)) {
        return {
          success: false,
          error: t('CSV file not provided or invalid.'),
        };
      }
      if (file.size > 5 * 1024 * 1024) {
        // 5MB check
        return {
          success: false,
          error: t('CSV file size exceeds 5MB limit.'),
        };
      }
      if (file.type !== 'text/csv') {
        return {
          success: false,
          error: t('Invalid file type. Only CSV is allowed.'),
        };
      }

      const csvText = await file.text();
      const rows = csvText.split('\n').slice(1); // Simple split, skip header

      if (rows.length === 0 || (rows.length === 1 && rows[0].trim() === '')) {
        return {
          success: false,
          error: t('CSV file is empty or contains only a header.'),
        };
      }

      for (const row of rows) {
        const trimmedRow = row.trim();
        if (!trimmedRow) continue; // Skip empty lines

        const [emailStr, roleStr] = trimmedRow.split(',').map((s) => s.trim());
        const rowInput = t('CSV Row: {email}, {role}', {
          email: emailStr || t('[missing]'),
          role: roleStr || t('[missing]'),
        });

        try {
          // Validate email
          const email = getEmailSchema(t).parse(emailStr);

          // Validate or default role
          let role: InviteRole = DEFAULT_ROLE; // Use defined default
          if (roleStr) {
            const parsedRole = z.enum(availableRoles).safeParse(roleStr.toLowerCase());
            if (parsedRole.success) {
              role = parsedRole.data;
            } else {
              throw new Error(t('Invalid role specified: {role}', { role: roleStr }));
            }
          }

          await authClient.organization.inviteMember({ email, role });
          results.successfulInvites += 1;
        } catch (error) {
          console.error(`Error processing CSV row ${rowInput}:`, error);
          results.failedItems.push({
            input: rowInput,
            error: error instanceof Error ? error.message : t('Processing failed'),
          });
        }
      }
    } else if (submissionType === 'manual') {
      const invitesJson = formData.get('invites') as string | null;
      if (!invitesJson) {
        return {
          success: false,
          error: t('Manual invite data not provided.'),
        };
      }

      const manualInvitesSchema = getManualInvitesSchema(t);
      let manualInvites: z.infer<typeof manualInvitesSchema>;
      try {
        manualInvites = manualInvitesSchema.parse(JSON.parse(invitesJson));
      } catch (parseError) {
        console.error('Error parsing manual invites JSON:', parseError);
        // Don't include validationErrors field, just return a general error
        return {
          success: false,
          error: t('Invalid format for manual invite data.'),
        };
      }

      if (manualInvites.length === 0) {
        return {
          success: false,
          error: t('No manual invites submitted.'),
        };
      }

      for (const invite of manualInvites) {
        try {
          // Email/Role already validated by Zod parse above
          await authClient.organization.inviteMember(invite);
          results.successfulInvites += 1;
        } catch (error) {
          console.error(`Error inviting manual member ${invite.email}:`, error);
          results.failedItems.push({
            input: invite,
            error: error instanceof Error ? error.message : t('Invite failed'),
          });
        }
      }
    } else {
      return { success: false, error: t('Invalid submission type.') };
    }

    // Revalidate only if changes were made
    if (results.successfulInvites > 0) {
      revalidatePath(`/${organizationId}/settings/users`);
      revalidateTag(`user_${userId}`); // Use userId from manually fetched session
    }

    // Determine overall success
    if (results.successfulInvites > 0 || results.failedItems.length === 0) {
      return { success: true, data: results };
    }
    return {
      success: false,
      error: t('All invitations failed.'),
      data: results,
    };
  } catch (error) {
    // Catch unexpected errors during processing (e.g., file reading)
    console.error('Unexpected error in bulkInviteMembers:', error);
    return {
      success: false,
      error: t('An unexpected server error occurred processing the invites.'),
    };
  }
}
