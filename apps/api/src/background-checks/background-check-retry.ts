import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BackgroundCheckStatus, db, Prisma } from '@db';
import type { BackgroundCheckIdentityClient } from './background-check-identity.client';

type GetForMemberFn = (params: {
  organizationId: string;
  memberId: string;
}) => Promise<{
  id: string;
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

export async function deleteForMember({
  organizationId,
  memberId,
  getForMember,
}: {
  organizationId: string;
  memberId: string;
  getForMember: GetForMemberFn;
}): Promise<{ ok: true }> {
  const existing = await getForMember({ organizationId, memberId });
  if (!existing) {
    throw new NotFoundException('Background check not found.');
  }
  // Hard delete; webhookEvents cascade via the FK. Frees the
  // @@unique([organizationId, memberId]) constraint for a fresh request.
  await db.backgroundCheckRequest.delete({
    where: { organizationId_memberId: { organizationId, memberId } },
  });
  return { ok: true };
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
      // Per-record, per-attempt key so each retry creates a fresh vendor
      // check rather than colliding with a prior attempt's idempotency key.
      idempotencyKey: `comp-background-check:${existing.id}:${attempt}`,
    });
  } catch (error) {
    // Restore the prior status (retry is only allowed from 'failed' or
    // 'cancelled'). Forcing 'failed' here would strip a cancelled check of the
    // webhook terminal-guard and let a late vendor webhook resurrect it.
    await db.backgroundCheckRequest.update({
      where,
      data: { status: existing.status, lastSyncedAt: new Date() },
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
