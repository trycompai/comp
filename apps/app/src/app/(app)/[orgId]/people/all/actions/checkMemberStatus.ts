'use server';

import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';

export const checkMemberStatus = async ({
  email,
  organizationId,
}: {
  email: string;
  organizationId: string;
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
      throw new Error("You don't have permission to reactivate members.");
    }

    // Find the user by email
    const user = await db.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      // User doesn't exist yet
      return { success: true, memberExists: false, isActive: false, reactivated: false };
    }

    // Check if there's a member for this user and organization (active or deactivated)
    const existingMember = await db.member.findFirst({
      where: {
        userId: user.id,
        organizationId,
      },
    });

    if (!existingMember) {
      // Member doesn't exist
      return { success: true, memberExists: false, isActive: false, reactivated: false };
    }

    if (existingMember.deactivated) {
      return {
        success: true,
        memberExists: true,
        isActive: true,
        reactivated: true,
        memberId: existingMember.id,
      };
    }

    // Member exists and is already active
    return {
      success: true,
      memberExists: true,
      isActive: true,
      reactivated: false,
      memberId: existingMember.id,
    };
  } catch (error) {
    console.error('Error checking member status:', error);
    throw error;
  }
};
