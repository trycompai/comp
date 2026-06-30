import { db } from '@db';
import { logger, schemaTask, tags } from '@trigger.dev/sdk';
import { z } from 'zod';

export const mergeDuplicateUser = schemaTask({
  id: 'merge-duplicate-user',
  schema: z.object({
    organizationId: z.string(),
    oldEmail: z.string().email(),
    newEmail: z.string().email(),
  }),
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

    await db.$transaction(
      async (tx) => {
        const o = oldMember.id;
        const n = newMember.id;

        // Policies: assigneeId, approverId, signedBy (String[] — replace in array)
        await tx.policy.updateMany({
          where: { assigneeId: o },
          data: { assigneeId: n },
        });
        await tx.policy.updateMany({
          where: { approverId: o },
          data: { approverId: n },
        });

        // signedBy is a String[], use raw update to replace the member id in the array
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

        // PolicyVersion: publishedById
        await tx.policyVersion.updateMany({
          where: { publishedById: o },
          data: { publishedById: n },
        });

        // Risk: assigneeId
        await tx.risk.updateMany({
          where: { assigneeId: o },
          data: { assigneeId: n },
        });

        // Task: assigneeId, approverId
        await tx.task.updateMany({
          where: { assigneeId: o },
          data: { assigneeId: n },
        });
        await tx.task.updateMany({
          where: { approverId: o },
          data: { approverId: n },
        });

        // TaskItem: assigneeId, createdById, updatedById
        await tx.taskItem.updateMany({
          where: { assigneeId: o },
          data: { assigneeId: n },
        });
        await tx.taskItem.updateMany({
          where: { createdById: o },
          data: { createdById: n },
        });
        await tx.taskItem.updateMany({
          where: { updatedById: o },
          data: { updatedById: n },
        });

        // Vendor: assigneeId
        await tx.vendor.updateMany({
          where: { assigneeId: o },
          data: { assigneeId: n },
        });

        // Finding: memberId (subject), createdById
        await tx.finding.updateMany({
          where: { memberId: o },
          data: { memberId: n },
        });
        await tx.finding.updateMany({
          where: { createdById: o },
          data: { createdById: n },
        });

        // FrameworkSyncOperation: performedById
        await tx.frameworkSyncOperation.updateMany({
          where: { performedById: o },
          data: { performedById: n },
        });

        // Comment: memberId
        await tx.comment.updateMany({
          where: { authorId: o },
          data: { authorId: n },
        });

        // AuditLog: memberId
        await tx.auditLog.updateMany({
          where: { memberId: o },
          data: { memberId: n },
        });

        // Device: memberId
        await tx.device.updateMany({
          where: { memberId: o },
          data: { memberId: n },
        });

        // BackgroundCheckRequest: memberId
        await tx.backgroundCheckRequest.updateMany({
          where: { memberId: o },
          data: { memberId: n },
        });

        // TrustAccessRequest: reviewerMemberId
        await tx.trustAccessRequest.updateMany({
          where: { reviewerMemberId: o },
          data: { reviewerMemberId: n },
        });

        // TrustAccessGrant: issuedByMemberId, revokedByMemberId
        await tx.trustAccessGrant.updateMany({
          where: { issuedByMemberId: o },
          data: { issuedByMemberId: n },
        });
        await tx.trustAccessGrant.updateMany({
          where: { revokedByMemberId: o },
          data: { revokedByMemberId: n },
        });

        // OffboardingChecklistCompletion: memberId
        await tx.offboardingChecklistCompletion.updateMany({
          where: { memberId: o },
          data: { memberId: n },
        });

        // OffboardingAccessRevocation: memberId, revokedById
        await tx.offboardingAccessRevocation.updateMany({
          where: { memberId: o },
          data: { memberId: n },
        });
        await tx.offboardingAccessRevocation.updateMany({
          where: { revokedById: oldMember.userId },
          data: { revokedById: newMember.userId },
        });

        // EmployeeTrainingVideoCompletion: skip videos the old member already has
        const existingCompletions =
          await tx.employeeTrainingVideoCompletion.findMany({
            where: { memberId: o },
            select: { id: true, videoId: true },
          });

        const newCompletions =
          await tx.employeeTrainingVideoCompletion.findMany({
            where: { memberId: n },
            select: { id: true, videoId: true },
          });
        const newCompletedVideoIds = new Set(
          newCompletions.map((c) => c.videoId),
        );

        const toMigrate = existingCompletions.filter(
          (c) => !newCompletedVideoIds.has(c.videoId),
        );

        if (toMigrate.length > 0) {
          await tx.employeeTrainingVideoCompletion.updateMany({
            where: { id: { in: toMigrate.map((c) => c.id) } },
            data: { memberId: n },
          });
        }

        logger.info('Re-pointed member relations', {
          policiesWithSignature: policiesWithSignature.length,
          trainingMigrated: toMigrate.length,
          trainingDropped: existingCompletions.length - toMigrate.length,
        });

        // ── Delete old member ────────────────────────────────────────────────
        await tx.member.delete({ where: { id: o } });

        // ── Re-point user-level relations before deleting oldUser ───────────
        // Must happen before the delete to prevent cascade wiping these records.

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

        // ── Delete old user sessions and the user record ─────────────────────
        await tx.session.deleteMany({ where: { userId: oldUser.id } });
        await tx.user.delete({ where: { id: oldUser.id } });

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
      survivingUserId: oldUser.id,
      survivingMemberId: oldMember.id,
    });

    return {
      success: true,
      survivingUserId: newUser.id,
      survivingMemberId: newMember.id,
      mergedUserId: oldUser.id,
      mergedMemberId: oldMember.id,
    };
  },
});
