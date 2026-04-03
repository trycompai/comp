'use server';

import { inviteSingleMemberViaApi } from '@/lib/people-api';

export const sendInvitationEmailToExistingMember = async ({
  email,
  organizationId: _organizationId,
  roles,
}: {
  email: string;
  organizationId: string;
  roles: string[];
}) => {
  try {
    const result = await inviteSingleMemberViaApi({
      email: email.toLowerCase(),
      roles,
    });

    if (!result.success) {
      throw new Error(result.error ?? 'Failed to send invitation.');
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw error;
  }
};
