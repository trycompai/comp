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
        deactivated: false,
      },
    });

    if (
      !currentUserMember ||
      (!currentUserMember.role.includes('admin') && !currentUserMember.role.includes('owner'))
    ) {
      throw new Error("You don't have permission to add members.");
    }

    let userId = '';
    const existingUser = await db.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
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

    const finalUserId = existingUser?.id ?? userId;

    // Check if there's an existing member (including deactivated ones) for this user and organization
    const existingMember = await db.member.findFirst({
      where: {
        userId: finalUserId,
        organizationId,
      },
    });

    let member;
    if (existingMember) {
      // If member exists but is deactivated, reactivate it and update roles
      if (existingMember.deactivated) {
        const roleString = roles.sort().join(',');
        member = await db.member.update({
          where: { id: existingMember.id },
          data: {
            deactivated: false,
            role: roleString,
          },
        });
      } else {
        // Member already exists and is active, return existing member
        member = existingMember;
      }
    } else {
      // No existing member, create a new one
      member = await auth.api.addMember({
        body: {
          userId: finalUserId,
          organizationId,
          role: roles, // Auth API expects role or role array
        },
      });
    }

    // Create training video completion entries for the new member (only if member was just created/reactivated)
    if (member?.id && !existingMember) {
      await createTrainingVideoEntries(member.id);
    }

    return { success: true, data: member };
  } catch (error) {
    console.error('Error adding employee:', error);
    return { success: false, error: 'Failed to add employee' };
  }
};
