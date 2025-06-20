'use server';

import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import type { Role } from '@comp/db/types';

export const addEmployeeWithoutInvite = async ({
  email,
  organizationId,
  roles,
}: {
  email: string;
  organizationId: string;
  roles: Role[];
}) => {
  try {
    let userId = '';
    const existingUser = await db.user.findUnique({
      where: {
        email,
      },
    });

    if (!existingUser) {
      const newUser = await db.user.create({
        data: {
          emailVerified: false,
          email,
          name: email.split('@')[0],
        },
      });

      userId = newUser.id;
    }

    const member = await auth.api.addMember({
      body: {
        userId: existingUser?.id ?? userId,
        organizationId,
        role: roles, // Auth API expects role or role array
      },
    });

    return { success: true, data: member };
  } catch (error) {
    console.error('Error adding employee:', error);
    return { success: false, error: 'Failed to add employee' };
  }
};
