import { Prisma } from '@db';
import {
  assertNoDanglingMemberReferences,
  findMemberForeignKeys,
  repointGenericForeignKeys,
} from './merge-duplicate-user-fk-discovery';

/**
 * Re-points every relation that points at Member.id when merging a
 * duplicate member into a surviving one. Most relations are discovered from
 * Postgres's catalog (see merge-duplicate-user-fk-discovery.ts) so newly
 * added ones are picked up automatically. Two categories still need
 * hand-written logic:
 *
 * - `UNIQUE_CONSTRAINT_EXCEPTIONS`: tables where the member-id column shares
 *   a unique constraint with another field. A blind `UPDATE` would violate
 *   that constraint if the new member already has a matching row, so these
 *   skip the duplicate row instead of moving it.
 * - Columns with no real database-level foreign key (`Policy.signedBy`, a
 *   `String[]`, and `IsmsObjective.ownerMemberId`, a plain `String`). These
 *   can never be found via catalog introspection, so they stay explicit.
 */

// Physical table names (post @@map, case-sensitive) whose member-id column
// carries a unique constraint alongside another field.
const UNIQUE_CONSTRAINT_EXCEPTIONS = new Set([
  'background_check_requests', // @@unique([organizationId, memberId])
  'OffboardingChecklistCompletion', // @@unique([memberId, templateItemId])
  'OffboardingAccessRevocation', // @@unique([memberId, vendorId])
  'EmployeeTrainingVideoCompletion', // @@unique([memberId, videoId])
]);

/** Splits rows keyed on the old member into ones to migrate vs. drop, based on whether the new member already has a row with the same dedupe key. */
function splitDuplicates<T>(
  oldRows: T[],
  newKeys: Set<string>,
  keyOf: (row: T) => string,
): { toMigrate: T[]; toDrop: T[] } {
  const toMigrate: T[] = [];
  const toDrop: T[] = [];
  for (const row of oldRows) {
    (newKeys.has(keyOf(row)) ? toDrop : toMigrate).push(row);
  }
  return { toMigrate, toDrop };
}

async function repointUniqueConstrainedExceptions(
  tx: Prisma.TransactionClient,
  organizationId: string,
  o: string,
  n: string,
): Promise<void> {
  // BackgroundCheckRequest: unique (organizationId, memberId) — a single row
  // per member per org, so this is a delete-or-move, not a list-and-diff.
  const newBgCheck = await tx.backgroundCheckRequest.findUnique({
    where: { organizationId_memberId: { organizationId, memberId: n } },
    select: { id: true },
  });
  if (newBgCheck) {
    await tx.backgroundCheckRequest.deleteMany({ where: { memberId: o } });
  } else {
    await tx.backgroundCheckRequest.updateMany({
      where: { memberId: o },
      data: { memberId: n },
    });
  }

  // OffboardingChecklistCompletion: unique (memberId, templateItemId)
  const existingChecklist = await tx.offboardingChecklistCompletion.findMany({
    where: { memberId: o },
    select: { id: true, templateItemId: true },
  });
  const newChecklistKeys = new Set(
    (
      await tx.offboardingChecklistCompletion.findMany({
        where: { memberId: n },
        select: { templateItemId: true },
      })
    ).map((c) => String(c.templateItemId)),
  );
  const checklistSplit = splitDuplicates(
    existingChecklist,
    newChecklistKeys,
    (c) => String(c.templateItemId),
  );
  if (checklistSplit.toMigrate.length > 0) {
    await tx.offboardingChecklistCompletion.updateMany({
      where: { id: { in: checklistSplit.toMigrate.map((c) => c.id) } },
      data: { memberId: n },
    });
  }
  if (checklistSplit.toDrop.length > 0) {
    await tx.offboardingChecklistCompletion.deleteMany({
      where: { id: { in: checklistSplit.toDrop.map((c) => c.id) } },
    });
  }

  // OffboardingAccessRevocation: unique (memberId, vendorId)
  const existingRevocations = await tx.offboardingAccessRevocation.findMany({
    where: { memberId: o },
    select: { id: true, vendorId: true },
  });
  const newRevocationKeys = new Set(
    (
      await tx.offboardingAccessRevocation.findMany({
        where: { memberId: n },
        select: { vendorId: true },
      })
    ).map((r) => r.vendorId),
  );
  const revocationSplit = splitDuplicates(
    existingRevocations,
    newRevocationKeys,
    (r) => r.vendorId,
  );
  if (revocationSplit.toMigrate.length > 0) {
    await tx.offboardingAccessRevocation.updateMany({
      where: { id: { in: revocationSplit.toMigrate.map((r) => r.id) } },
      data: { memberId: n },
    });
  }
  if (revocationSplit.toDrop.length > 0) {
    await tx.offboardingAccessRevocation.deleteMany({
      where: { id: { in: revocationSplit.toDrop.map((r) => r.id) } },
    });
  }

  // EmployeeTrainingVideoCompletion: unique (memberId, videoId) — no delete
  // branch; a dropped duplicate is left on the old member and cleaned up by
  // the member.delete cascade.
  const existingCompletions = await tx.employeeTrainingVideoCompletion.findMany(
    {
      where: { memberId: o },
      select: { id: true, videoId: true },
    },
  );
  const newCompletionKeys = new Set(
    (
      await tx.employeeTrainingVideoCompletion.findMany({
        where: { memberId: n },
        select: { videoId: true },
      })
    ).map((c) => c.videoId),
  );
  const completionSplit = splitDuplicates(
    existingCompletions,
    newCompletionKeys,
    (c) => c.videoId,
  );
  if (completionSplit.toMigrate.length > 0) {
    await tx.employeeTrainingVideoCompletion.updateMany({
      where: { id: { in: completionSplit.toMigrate.map((c) => c.id) } },
      data: { memberId: n },
    });
  }
}

/** Fields that hold a member id but carry no real database-level foreign key, so catalog introspection can never find them. Returns the count of Policy rows updated, for logging. */
async function repointNonForeignKeyExceptions(
  tx: Prisma.TransactionClient,
  o: string,
  n: string,
): Promise<number> {
  // Policy.signedBy: String[] — replace the id inside the array.
  const policiesWithSignature = await tx.policy.findMany({
    where: { signedBy: { has: o } },
    select: { id: true, signedBy: true },
  });
  for (const policy of policiesWithSignature) {
    const updated = policy.signedBy.map((id) => (id === o ? n : id));
    await tx.policy.update({
      where: { id: policy.id },
      data: { signedBy: updated },
    });
  }

  // IsmsObjective.ownerMemberId: plain id, no FK — re-point to avoid a
  // dangling reference.
  await tx.ismsObjective.updateMany({
    where: { ownerMemberId: o },
    data: { ownerMemberId: n },
  });

  return policiesWithSignature.length;
}

export interface MemberRelationStats {
  foreignKeysDiscovered: number;
  genericRepointed: string[];
  signedByPoliciesUpdated: number;
}

/**
 * Re-points every relation from `oldMemberId` to `newMemberId`, then throws
 * if anything is still left pointing at `oldMemberId` — see
 * assertNoDanglingMemberReferences for why that check matters.
 */
export async function repointMemberRelations(
  tx: Prisma.TransactionClient,
  organizationId: string,
  oldMemberId: string,
  newMemberId: string,
): Promise<MemberRelationStats> {
  const foreignKeys = await findMemberForeignKeys(tx);

  const genericRepointed = await repointGenericForeignKeys(
    tx,
    foreignKeys,
    UNIQUE_CONSTRAINT_EXCEPTIONS,
    oldMemberId,
    newMemberId,
  );
  await repointUniqueConstrainedExceptions(
    tx,
    organizationId,
    oldMemberId,
    newMemberId,
  );
  const signedByPoliciesUpdated = await repointNonForeignKeyExceptions(
    tx,
    oldMemberId,
    newMemberId,
  );

  await assertNoDanglingMemberReferences(tx, foreignKeys, oldMemberId, {
    'IsmsObjective.ownerMemberId': () =>
      tx.ismsObjective.count({ where: { ownerMemberId: oldMemberId } }),
    'Policy.signedBy': () =>
      tx.policy.count({ where: { signedBy: { has: oldMemberId } } }),
  });

  return {
    foreignKeysDiscovered: foreignKeys.length,
    genericRepointed: genericRepointed.map(
      (fk) => `${fk.tableName}.${fk.columnName}`,
    ),
    signedByPoliciesUpdated,
  };
}
