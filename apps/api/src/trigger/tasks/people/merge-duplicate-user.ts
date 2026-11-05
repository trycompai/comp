import { db } from '@db';
import { logger, schemaTask, tags } from '@trigger.dev/sdk';
import { z } from 'zod';
import { repointMemberRelations } from './merge-duplicate-user-member-relations';

export const mergeDuplicateUser = schemaTask({
  id: 'merge-duplicate-user',
  schema: z
    .object({
      organizationId: z.string(),
      oldEmail: z.string().email(),
      newEmail: z.string().email(),
    })
    .refine(
      ({ oldEmail, newEmail }) =>
        oldEmail.toLowerCase() !== newEmail.toLowerCase(),
      { path: ['newEmail'], message: 'newEmail must differ from oldEmail' },
    ),
  run: async ({ organizationId, oldEmail, newEmail }) => {
    await tags.add([`org:${organizationId}`]);

    // ── 1. Resolve both users ────────────────────────────────────────────────

    const [oldUser, newUser] = await Promise.all([
      db.user.findUnique({ where: { email: oldEmail } }),
      db.user.findUnique({ where: { email: newEmail } }),
    ]);

    if (!oldUser) {
      throw new Error(`Old user not found: ${oldEmail}`);
    }
    if (!newUser) {
      throw new Error(`New user not found: ${newEmail}`);
    }

    logger.info('Resolved users', {
      oldUserId: oldUser.id,
      newUserId: newUser.id,
    });

    // ── 2. Resolve both members in this org ──────────────────────────────────

    const [oldMember, newMember] = await Promise.all([
      db.member.findFirst({ where: { userId: oldUser.id, organizationId } }),
      db.member.findFirst({ where: { userId: newUser.id, organizationId } }),
    ]);

    if (!oldMember) {
      throw new Error(
        `Old member not found for user ${oldUser.id} in org ${organizationId}`,
      );
    }
    if (!newMember) {
      throw new Error(
        `New member not found for user ${newUser.id} in org ${organizationId}`,
      );
    }

    logger.info('Resolved members', {
      oldMemberId: oldMember.id,
      newMemberId: newMember.id,
    });

    // ── 3. Merge inside a transaction ────────────────────────────────────────

    let oldUserHasOtherOrgs = false;

    await db.$transaction(
      async (tx) => {
        const o = oldMember.id;
        const n = newMember.id;

        // ── 2b. Determine whether the old user belongs to other orgs ─────────
        // User-level relations (Account, sessions, etc.) are not org-scoped, so
        // they can only be safely re-pointed/deleted if this is the old user's
        // only org membership. Otherwise, only merge the member record for this
        // org and leave the user record intact for their other orgs. Computed
        // inside the transaction (not before it) so a concurrent membership
        // change can't make this stale relative to the mutations below.
        const otherOrgMemberships = await tx.member.count({
          where: {
            userId: oldUser.id,
            organizationId: { not: organizationId },
          },
        });
        oldUserHasOtherOrgs = otherOrgMemberships > 0;

        logger.info('Checked old user org memberships', {
          oldUserId: oldUser.id,
          otherOrgMemberships,
          oldUserHasOtherOrgs,
        });

        // ── Re-point every member-scoped relation ─────────────────────────────
        // Discovers foreign keys pointing at Member.id from Postgres's own
        // catalog (plus a small set of hand-written exceptions for unique
        // constraints and non-FK columns) instead of a hand-maintained list,
        // then throws if anything is still left pointing at the old member —
        // see merge-duplicate-user-member-relations.ts for why.
        const memberRelationStats = await repointMemberRelations(
          tx,
          organizationId,
          o,
          n,
        );

        logger.info('Re-pointed member relations', memberRelationStats);

        // ── Delete old member ────────────────────────────────────────────────
        // Safety check above runs before this delete so an unhandled relation
        // fails loudly here, rather than being silently cascade-deleted or
        // nulled out by this delete.
        await tx.member.delete({ where: { id: o } });

        // ── User-level relations ──────────────────────────────────────────────
        // Only safe when the old user has no membership in any other org —
        // otherwise these relations still belong to that other org and must
        // be left alone. The old User record itself is kept (not deleted) so
        // it remains addressable, but its sessions are cleared and every
        // relation below moves to the surviving user.
        if (!oldUserHasOtherOrgs) {
          // OAuth accounts: move to surviving user
          await tx.account.updateMany({
            where: { userId: oldUser.id },
            data: { userId: newUser.id },
          });

          // AuditLog: onDelete Cascade — re-point to preserve history
          await tx.auditLog.updateMany({
            where: { userId: oldUser.id },
            data: { userId: newUser.id },
          });

          // FleetPolicyResult: onDelete Cascade — re-point to preserve results
          await tx.fleetPolicyResult.updateMany({
            where: { userId: oldUser.id },
            data: { userId: newUser.id },
          });

          // OauthAccessToken: onDelete Cascade
          await tx.oauthAccessToken.updateMany({
            where: { userId: oldUser.id },
            data: { userId: newUser.id },
          });

          // OauthConsent: onDelete Cascade
          await tx.oauthConsent.updateMany({
            where: { userId: oldUser.id },
            data: { userId: newUser.id },
          });

          // McpOrgBinding: onDelete Cascade, unique on userId — delete old, keep new
          await tx.mcpOrgBinding.deleteMany({ where: { userId: oldUser.id } });

          // IntegrationSyncLog / IntegrationOAuthError: nullable userId — re-point to preserve actor
          await tx.integrationSyncLog.updateMany({
            where: { userId: oldUser.id },
            data: { userId: newUser.id },
          });
          await tx.integrationOAuthError.updateMany({
            where: { userId: oldUser.id },
            data: { userId: newUser.id },
          });

          // EvidenceSubmission: onDelete SetNull — re-point to preserve authorship
          await tx.evidenceSubmission.updateMany({
            where: { submittedById: oldUser.id },
            data: { submittedById: newUser.id },
          });
          await tx.evidenceSubmission.updateMany({
            where: { reviewedById: oldUser.id },
            data: { reviewedById: newUser.id },
          });

          // Finding: createdByAdminId — re-point to preserve authorship
          await tx.finding.updateMany({
            where: { createdByAdminId: oldUser.id },
            data: { createdByAdminId: newUser.id },
          });

          // IntegrationResult: onDelete Cascade — re-point to preserve assignment
          await tx.integrationResult.updateMany({
            where: { assignedUserId: oldUser.id },
            data: { assignedUserId: newUser.id },
          });

          // OffboardingChecklistCompletion: onDelete SetNull — re-point to preserve actor
          await tx.offboardingChecklistCompletion.updateMany({
            where: { completedById: oldUser.id },
            data: { completedById: newUser.id },
          });

          // OffboardingAccessRevocation.revokedById: onDelete SetNull — re-point to preserve actor
          await tx.offboardingAccessRevocation.updateMany({
            where: { revokedById: oldUser.id },
            data: { revokedById: newUser.id },
          });

          // ── Delete old user sessions ─────────────────────
          await tx.session.deleteMany({ where: { userId: oldUser.id } });
        }

        // ── Update pending invitations ───────────────────────────────────────
        await tx.invitation.updateMany({
          where: { email: oldEmail, organizationId },
          data: { email: newEmail },
        });
      },
      { timeout: 30000 },
    );

    logger.info('Merge complete', {
      organizationId,
      oldEmail,
      newEmail,
      survivingUserId: newUser.id,
      survivingMemberId: newMember.id,
      userLevelRelationsMerged: !oldUserHasOtherOrgs,
    });

    return {
      success: true,
      survivingUserId: newUser.id,
      survivingMemberId: newMember.id,
      userLevelRelationsMerged: !oldUserHasOtherOrgs,
      mergedUserId: oldUser.id,
      mergedMemberId: oldMember.id,
    };
  },
});
