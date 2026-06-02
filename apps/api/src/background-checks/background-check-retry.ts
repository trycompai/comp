import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BackgroundCheckStatus, db, Prisma } from '@db';
import type { BackgroundCheckIdentityClient } from './background-check-identity.client';

type GetForMemberFn = (params: {
  organizationId: string;
  memberId: string;
}) => Promise<{
  rerunCount: number;
  employeeName: string;
  employeeEmail: string;
  status: BackgroundCheckStatus;
} | null>;

export function assertTransitionAllowed(
  action: 'cancel' | 'retry',
  status: BackgroundCheckStatus,
): void {
  const allowed: Record<'cancel' | 'retry', BackgroundCheckStatus[]> = {
    cancel: [
      BackgroundCheckStatus.invited,
      BackgroundCheckStatus.in_progress,
      BackgroundCheckStatus.in_review,
    ],
    retry: [BackgroundCheckStatus.failed, BackgroundCheckStatus.cancelled],
  };
  if (!allowed[action].includes(status)) {
    throw new BadRequestException(
      `Cannot ${action} a background check in '${status}' status.`,
    );
  }
}

export async function cancelForMember({
  organizationId,
  memberId,
  getForMember,
}: {
  organizationId: string;
  memberId: string;
  getForMember: GetForMemberFn;
}) {
  const existing = await getForMember({ organizationId, memberId });
  if (!existing) {
    throw new NotFoundException('Background check not found.');
  }
  assertTransitionAllowed('cancel', existing.status);

  return db.backgroundCheckRequest.update({
    where: { organizationId_memberId: { organizationId, memberId } },
    data: {
      status: BackgroundCheckStatus.cancelled,
      lastSyncedAt: new Date(),
    },
  });
}

export async function retryForMember({
  organizationId,
  memberId,
  requesterEmail,
  identityClient,
  getForMember,
}: {
  organizationId: string;
  memberId: string;
  requesterEmail: string;
  identityClient: BackgroundCheckIdentityClient;
  getForMember: GetForMemberFn;
}) {
  const existing = await getForMember({ organizationId, memberId });
  if (!existing) {
    throw new NotFoundException('Background check not found.');
  }
  assertTransitionAllowed('retry', existing.status);

  const attempt = existing.rerunCount + 1;
  const where = { organizationId_memberId: { organizationId, memberId } };

  // Free retry: no charge. Create a fresh Identity check first (varied
  // idempotency key) so a late webhook from the prior check cannot match
  // the row after we swap in the new id.
  let identityResult;
  try {
    identityResult = await identityClient.createBackgroundCheck({
      organizationId,
      memberId,
      employeeName: existing.employeeName,
      employeeEmail: existing.employeeEmail,
      requesterEmail,
      attempt,
    });
  } catch (error) {
    await db.backgroundCheckRequest.update({
      where,
      data: { status: BackgroundCheckStatus.failed, lastSyncedAt: new Date() },
    });
    throw error;
  }

  return db.backgroundCheckRequest.update({
    where,
    data: {
      identityBackgroundCheckId: identityResult.id,
      candidateUrl: identityResult.candidateUrl ?? null,
      status: identityResult.status,
      rerunCount: attempt,
      identityStatus: null,
      employmentStatus: null,
      referenceStatus: null,
      rightToWorkStatus: null,
      adjudicationStatus: null,
      reportSnapshot: Prisma.JsonNull,
      reportSyncedAt: null,
      lastSyncedAt: new Date(),
    },
  });
}
