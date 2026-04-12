import { BadRequestException } from '@nestjs/common';
import { db } from '@db';

/**
 * Validates that the target member is not a platform admin,
 * unless the current user is also a platform admin.
 *
 * Platform admins (User.role === 'admin') are internal Comp AI staff.
 * Non-platform-admin users cannot assign them as assignees/approvers.
 * Platform admin users CAN assign other platform admins.
 */
export async function validateNotPlatformAdmin({
  memberId,
  organizationId,
  currentUserId,
  action = 'assignee',
}: {
  memberId: string;
  organizationId: string;
  currentUserId?: string;
  action?: 'assignee' | 'approver';
}): Promise<void> {
  const member = await db.member.findFirst({
    where: { id: memberId, organizationId },
    include: { user: { select: { role: true } } },
  });

  if (member?.user.role !== 'admin') return;

  // Allow platform admins to assign other platform admins
  if (currentUserId) {
    const currentUser = await db.user.findUnique({
      where: { id: currentUserId },
      select: { role: true },
    });
    if (currentUser?.role === 'admin') return;
  }

  throw new BadRequestException(`Cannot assign a platform admin as ${action}`);
}
