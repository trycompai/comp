'use server';

import { createTrainingVideoEntries } from '@/lib/db/employee';
import { auth } from '@/utils/auth';
import { sendInviteMemberEmail } from '@comp/email';
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

    if (!currentUserMember) {
      throw new Error("You don't have permission to add members.");
    }

    const isAdmin =
      currentUserMember.role.includes('admin') || currentUserMember.role.includes('owner');
    const isAuditor = currentUserMember.role.includes('auditor');

    if (!isAdmin && !isAuditor) {
      throw new Error("You don't have permission to add members.");
    }

    if (isAuditor && !isAdmin) {
      const onlyAuditorRole = roles.length === 1 && roles[0] === 'auditor';
      if (!onlyAuditorRole) {
        throw new Error("Auditors can only add users with the 'auditor' role.");
      }
    }

    // Get organization name
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    if (!organization) {
      throw new Error('Organization not found.');
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

    // Generate invite link
    const inviteLink = `${process.env.NEXT_PUBLIC_PORTAL_URL}/${organizationId}`;

    // Send the invitation email (non-fatal: member is already created)
    let emailSent = true;
    let emailError: string | undefined;
    try {
      await sendInviteMemberEmail({
        inviteeEmail: email.toLowerCase(),
        inviteLink,
        organizationName: organization.name,
      });
    } catch (emailErr) {
      emailSent = false;
      emailError = emailErr instanceof Error ? emailErr.message : 'Failed to send invite email';
      console.error('Invite email failed after member was added:', { email, organizationId, error: emailErr });
    }

    return {
      success: true,
      data: member,
      emailSent,
      ...(emailError && { emailError }),
    };
  } catch (error) {
    console.error('Error adding employee:', error);
    return { success: false, error: 'Failed to add employee' };
  }
};
