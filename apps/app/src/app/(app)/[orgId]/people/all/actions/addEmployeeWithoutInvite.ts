'use server';

import type { Role } from '@db';
import { inviteSingleMemberViaApi } from '@/lib/people-api';

export const addEmployeeWithoutInvite = async ({
  email,
  organizationId: _organizationId,
  roles,
}: {
  email: string;
  organizationId: string;
  roles: Role[];
}) => {
  try {
    const result = await inviteSingleMemberViaApi({
      email: email.toLowerCase(),
      roles,
    });

    return {
      success: result.success,
      data: undefined,
      emailSent: result.emailSent ?? result.success,
      ...(result.error && {
        error: result.error,
        emailError: result.error,
      }),
    };
  } catch (error) {
    console.error('Error adding employee:', error);
    return { success: false, error: 'Failed to add employee' };
  }
};
