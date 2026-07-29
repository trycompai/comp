import type { Member } from '@db';
import { db } from '@db/server';

/** Outcome of a single acceptance attempt, so routes can map it to a response. */
export type PolicyAcceptanceResult = 'accepted' | 'already-signed' | 'not-found';

/**
 * Accepts a policy for `member` and records WHEN it happened.
 *
 * `Policy.signedBy` is a flat array of member ids with no timestamp, so the
 * acceptance audit log is the only record of the signing time. It is what the
 * policy Activity tab and `GET /v1/audit-logs?entityType=policy&entityId=...`
 * read to answer "when did X sign policy Y" for auditors. Both writes go in one
 * transaction so a signature can never exist without its timestamp.
 *
 * Re-accepting is a no-op, keeping the logged time the first acceptance of the
 * current version (publishing a new version clears `signedBy`).
 */
export async function acceptPolicyForMember({
  policyId,
  member,
  userId,
}: {
  policyId: string;
  member: Pick<Member, 'id' | 'organizationId'>;
  userId: string;
}): Promise<PolicyAcceptanceResult> {
  const policy = await db.policy.findFirst({
    where: { id: policyId, organizationId: member.organizationId },
    select: { id: true, name: true, currentVersionId: true },
  });

  if (!policy) {
    return 'not-found';
  }

  const accepted = await db.$transaction(async (tx) => {
    // The signature is claimed with a conditional update instead of a
    // read-then-write check: Postgres re-evaluates the `NOT has` filter after
    // taking the row lock, so a concurrent accept of the same policy matches
    // zero rows rather than appending a second signature and a second log.
    const { count } = await tx.policy.updateMany({
      where: {
        id: policy.id,
        organizationId: member.organizationId,
        NOT: { signedBy: { has: member.id } },
      },
      data: { signedBy: { push: member.id } },
    });

    if (count === 0) {
      return false;
    }

    await tx.auditLog.create({
      data: {
        organizationId: member.organizationId,
        userId,
        memberId: member.id,
        entityType: 'policy',
        entityId: policy.id,
        description: 'accepted this policy',
        data: {
          action: 'accept',
          policyName: policy.name,
          // Which version was accepted — a republish clears signedBy, so an
          // acceptance always belongs to the version current at that moment.
          policyVersionId: policy.currentVersionId,
        },
      },
    });

    return true;
  });

  return accepted ? 'accepted' : 'already-signed';
}
