import { ConflictException, Logger } from '@nestjs/common';
import { db } from '@db';
import { triggerEmail } from '../../email/trigger-email';
import { LoginEmailChangedEmail } from '../../email/templates/login-email-changed';

export interface LoginEmailChange {
  oldEmail: string;
  newEmail: string;
}

/**
 * Validates an admin-initiated login email change for a member.
 *
 * Returns the normalized change to apply, or null when the requested email
 * is already the member's login email (no-op). Throws ConflictException when
 * the email belongs to another account, or when the target user also belongs
 * to other organizations (a login email is global, so one org's admin must
 * not change it for a user shared with other orgs — that user can change it
 * themselves from Settings → User).
 */
export async function validateLoginEmailChange(params: {
  userId: string;
  organizationId: string;
  requestedEmail: string;
}): Promise<LoginEmailChange | null> {
  const { userId, organizationId, requestedEmail } = params;
  const newEmail = requestedEmail.trim().toLowerCase();

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true },
  });

  if (user.email.toLowerCase() === newEmail) {
    return null;
  }

  const emailTaken = await db.user.findFirst({
    where: {
      email: { equals: newEmail, mode: 'insensitive' },
      id: { not: userId },
    },
    select: { id: true },
  });
  if (emailTaken) {
    throw new ConflictException(
      'That email is already used by another account',
    );
  }

  const otherOrgMemberships = await db.member.count({
    where: {
      userId,
      organizationId: { not: organizationId },
      isActive: true,
      deactivated: false,
    },
  });
  if (otherOrgMemberships > 0) {
    throw new ConflictException(
      'This member also belongs to other organizations, so their login email cannot be changed from here. They can change it themselves under Settings → User.',
    );
  }

  return { oldEmail: user.email, newEmail };
}

/**
 * Notifies both the old and new address that the login email changed.
 * Fire-and-forget: a notification failure must not fail the update itself.
 */
export async function notifyLoginEmailChanged(params: {
  organizationId: string;
  change: LoginEmailChange;
  logger: Logger;
}): Promise<void> {
  const { organizationId, change, logger } = params;

  try {
    const organization = await db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { name: true },
    });

    await Promise.all(
      [change.oldEmail, change.newEmail].map((to) =>
        triggerEmail({
          to,
          subject: 'Your Comp AI login email was changed',
          react: LoginEmailChangedEmail({
            organizationName: organization.name,
            oldEmail: change.oldEmail,
            newEmail: change.newEmail,
          }),
        }),
      ),
    );
  } catch (error) {
    logger.error(
      `Failed to send login email change notifications (${change.oldEmail} -> ${change.newEmail}):`,
      error,
    );
  }
}
