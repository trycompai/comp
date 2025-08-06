'use server';

import { auth } from '@/utils/auth';
import type { Role } from '@db';
import { db } from '@db';
import { getGT } from 'gt-next/server';

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
    const t = await getGT();
    return { success: false, error: t('Failed to add employee') };
  }
};
