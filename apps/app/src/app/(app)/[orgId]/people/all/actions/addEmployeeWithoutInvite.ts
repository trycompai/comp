'use server';

import { createTrainingVideoEntries } from '@/lib/db/employee';
import { auth } from '@/utils/auth';
import type { Role } from '@db';
import { db } from '@db';
import { headers } from 'next/headers';

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
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.session) {
      throw new Error('Authentication required.');
    }
    const currentUserId = session.session.userId;
    const currentUserMember = await db.member.findFirst({
      where: {
        organizationId: organizationId,
        userId: currentUserId,
      },
    });

    if (
      !currentUserMember ||
      (!currentUserMember.role.includes('admin') && !currentUserMember.role.includes('owner'))
    ) {
      throw new Error("You don't have permission to add members.");
    }

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

    // Create training video completion entries for the new member
    if (member?.id) {
      await createTrainingVideoEntries(member.id);
    }

    return { success: true, data: member };
  } catch (error) {
    console.error('Error adding employee:', error);
    return { success: false, error: 'Failed to add employee' };
  }
};
