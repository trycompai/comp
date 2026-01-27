'use server';

import { auth } from '@/utils/auth';
import { authClient } from '@/utils/auth-client';
import type { Role } from '@db';
import { db } from '@db';
import { headers } from 'next/headers';

export const inviteNewMember = async ({
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

    if (!currentUserMember) {
      throw new Error("You don't have permission to invite members.");
    }

    const isAdmin =
      currentUserMember.role.includes('admin') || currentUserMember.role.includes('owner');
    const isAuditor = currentUserMember.role.includes('auditor');

    if (!isAdmin && !isAuditor) {
      throw new Error("You don't have permission to invite members.");
    }

    // Auditors can only invite other auditors
    if (isAuditor && !isAdmin) {
      const onlyAuditorRole = roles.length === 1 && roles[0] === 'auditor';
      if (!onlyAuditorRole) {
        throw new Error("Auditors can only invite users with the 'auditor' role.");
      }
    }

    // Use authClient to send the invitation
    await authClient.organization.inviteMember({
      email: email.toLowerCase(),
      role: roles.length === 1 ? roles[0] : roles,
    });

    return { success: true };
  } catch (error) {
    console.error('Error inviting member:', error);
    throw error;
  }
};
