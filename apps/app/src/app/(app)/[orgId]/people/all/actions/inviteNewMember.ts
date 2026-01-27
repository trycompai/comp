'use server';

import { maskEmail } from '@/lib/mask-email';
import { auth } from '@/utils/auth';
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
  const requestId = crypto.randomUUID();
  const safeEmail = maskEmail(email);
  const roleString = roles.join(',');
  const startTime = Date.now();

  console.info('[inviteNewMember] start', {
    requestId,
    organizationId,
    invitedEmail: safeEmail,
    roles: roleString,
  });

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.session) {
      console.warn('[inviteNewMember] missing session', { requestId, organizationId });
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
      console.warn('[inviteNewMember] inviter not in org', {
        requestId,
        organizationId,
        inviterUserId: currentUserId,
      });
      throw new Error("You don't have permission to invite members.");
    }

    const isAdmin =
      currentUserMember.role.includes('admin') || currentUserMember.role.includes('owner');
    const isAuditor = currentUserMember.role.includes('auditor');

    if (!isAdmin && !isAuditor) {
      console.warn('[inviteNewMember] inviter lacks role', {
        requestId,
        organizationId,
        inviterUserId: currentUserId,
        inviterRole: currentUserMember.role,
      });
      throw new Error("You don't have permission to invite members.");
    }

    // Auditors can only invite other auditors
    if (isAuditor && !isAdmin) {
      const onlyAuditorRole = roles.length === 1 && roles[0] === 'auditor';
      if (!onlyAuditorRole) {
        console.warn('[inviteNewMember] auditor role mismatch', {
          requestId,
          organizationId,
          inviterUserId: currentUserId,
          invitedRoles: roleString,
        });
        throw new Error("Auditors can only invite users with the 'auditor' role.");
      }
    }

    // Use server-side auth API to create the invitation
    // Role should be a comma-separated string for multiple roles
    const inviteResult = await auth.api.createInvitation({
      headers: await headers(),
      body: {
        email: email.toLowerCase(),
        role: roleString,
        organizationId,
      },
    });

    console.info('[inviteNewMember] success', {
      requestId,
      organizationId,
      invitedEmail: safeEmail,
      roles: roleString,
      durationMs: Date.now() - startTime,
      resultKeys: inviteResult && typeof inviteResult === 'object' ? Object.keys(inviteResult) : [],
    });

    return { success: true };
  } catch (error) {
    console.error('[inviteNewMember] failure', {
      requestId,
      organizationId,
      invitedEmail: safeEmail,
      roles: roleString,
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
