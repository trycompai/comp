import { createTrainingVideoEntries } from '@/lib/db/employee';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { sendInviteMemberEmail } from '@comp/email/lib/invite-member';
import { NextRequest, NextResponse } from 'next/server';

interface InviteItem {
  email: string;
  roles: string[];
}

interface InviteResult {
  email: string;
  success: boolean;
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Ensure Origin header is present for better-auth API calls
    const reqHeaders = new Headers(req.headers);
    if (!reqHeaders.get('origin')) {
      reqHeaders.set('origin', req.nextUrl.origin);
    }

    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session?.session?.activeOrganizationId || !session.session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.session.activeOrganizationId;
    const currentUserId = session.session.userId;

    // Validate caller permissions
    const currentUserMember = await db.member.findFirst({
      where: { organizationId, userId: currentUserId, deactivated: false },
    });

    if (!currentUserMember) {
      return NextResponse.json(
        { error: "You don't have permission to invite members." },
        { status: 403 },
      );
    }

    const isAdmin =
      currentUserMember.role.includes('admin') ||
      currentUserMember.role.includes('owner');
    const isAuditor = currentUserMember.role.includes('auditor');

    if (!isAdmin && !isAuditor) {
      return NextResponse.json(
        { error: "You don't have permission to invite members." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const invites: InviteItem[] = body.invites;

    if (!Array.isArray(invites) || invites.length === 0) {
      return NextResponse.json(
        { error: 'At least one invite is required.' },
        { status: 400 },
      );
    }

    const results: InviteResult[] = [];

    for (const invite of invites) {
      try {
        // Auditors can only invite auditors
        if (isAuditor && !isAdmin) {
          const onlyAuditor =
            invite.roles.length === 1 && invite.roles[0] === 'auditor';
          if (!onlyAuditor) {
            results.push({
              email: invite.email,
              success: false,
              error: "Auditors can only invite users with the 'auditor' role.",
            });
            continue;
          }
        }

        const hasEmployeeRoleAndNoAdmin =
          !invite.roles.includes('admin') &&
          (invite.roles.includes('employee') ||
            invite.roles.includes('contractor'));

        if (hasEmployeeRoleAndNoAdmin) {
          await addEmployeeWithoutInvite(
            invite.email.toLowerCase(),
            invite.roles,
            organizationId,
            reqHeaders,
          );
        } else {
          await inviteWithCheck(
            invite.email.toLowerCase(),
            invite.roles,
            organizationId,
            currentUserId,
            reqHeaders,
          );
        }

        results.push({ email: invite.email, success: true });
      } catch (error) {
        results.push({
          email: invite.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error processing invitations:', error);
    return NextResponse.json(
      { error: 'Failed to process invitations.' },
      { status: 500 },
    );
  }
}

async function addEmployeeWithoutInvite(
  email: string,
  roles: string[],
  organizationId: string,
  headers: Headers,
) {
  let userId = '';
  const existingUser = await db.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });

  if (!existingUser) {
    const newUser = await db.user.create({
      data: { emailVerified: false, email, name: email.split('@')[0] },
    });
    userId = newUser.id;
  }

  const finalUserId = existingUser?.id ?? userId;

  const existingMember = await db.member.findFirst({
    where: { userId: finalUserId, organizationId },
  });

  let member;
  if (existingMember) {
    if (existingMember.deactivated) {
      const roleString = [...roles].sort().join(',');
      member = await db.member.update({
        where: { id: existingMember.id },
        data: { deactivated: false, role: roleString },
      });
    } else {
      member = existingMember;
    }
  } else {
    member = await auth.api.addMember({
      headers,
      body: {
        userId: finalUserId,
        organizationId,
        role: roles.join(','),
      },
    });
  }

  if (member?.id && !existingMember) {
    await createTrainingVideoEntries(member.id);
  }
}

async function inviteWithCheck(
  email: string,
  roles: string[],
  organizationId: string,
  currentUserId: string,
  headers: Headers,
) {
  const existingUser = await db.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });

  if (existingUser) {
    const existingMember = await db.member.findFirst({
      where: { userId: existingUser.id, organizationId },
    });

    if (existingMember) {
      if (existingMember.deactivated) {
        // Reactivate with new roles
        const roleString = [...roles].sort().join(',');
        await db.member.update({
          where: { id: existingMember.id },
          data: { deactivated: false, isActive: true, role: roleString },
        });
        return;
      }

      // Active member — send invitation email (e.g. role change notification)
      await sendInvitationEmailToExistingMember(
        email,
        roles,
        organizationId,
        currentUserId,
      );
      return;
    }
  }

  // User doesn't exist or isn't a member yet — create invitation
  const roleString = roles.join(',');
  await auth.api.createInvitation({
    headers,
    body: { email, role: roleString, organizationId },
  });
}

async function sendInvitationEmailToExistingMember(
  email: string,
  roles: string[],
  organizationId: string,
  inviterId: string,
) {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });

  if (!organization) {
    throw new Error('Organization not found.');
  }

  const invitation = await db.invitation.create({
    data: {
      email: email.toLowerCase(),
      organizationId,
      role: roles.length === 1 ? roles[0] : roles.join(','),
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      inviterId,
    },
  });

  const betterAuthUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  const isLocalhost = process.env.NODE_ENV === 'development';
  const protocol = isLocalhost ? 'http' : 'https';
  const isDevEnv = betterAuthUrl?.includes('dev.trycomp.ai');
  const isProdEnv = betterAuthUrl?.includes('app.trycomp.ai');
  const domain = isDevEnv
    ? 'dev.trycomp.ai'
    : isProdEnv
      ? 'app.trycomp.ai'
      : 'localhost:3000';
  const inviteLink = `${protocol}://${domain}/invite/${invitation.id}`;

  await sendInviteMemberEmail({
    inviteeEmail: email.toLowerCase(),
    inviteLink,
    organizationName: organization.name,
  });
}
