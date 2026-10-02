import { db } from '@db/server';
import { portalPolicyWhere } from './portal-policy-access';

/** Validate the entire batch before writing, in one serializable transaction. */
export async function acknowledgePortalPolicies({
  userId,
  organizationId,
  policyIds,
  memberId,
}: {
  userId: string;
  organizationId: string;
  policyIds: string[];
  memberId?: string;
}) {
  return db.$transaction(
    async (transaction) => {
      const member = await transaction.member.findFirst({
        where: {
          userId,
          organizationId,
          isActive: true,
          deactivated: false,
          ...(memberId ? { id: memberId } : {}),
        },
        select: { id: true, department: true },
      });
      if (!member) return { success: false, status: 403 };

      const ids = [...new Set(policyIds)];
      const where = portalPolicyWhere({ organizationId, department: member.department });
      const policies = await transaction.policy.findMany({
        where: { ...where, id: { in: ids } },
        select: { id: true, signedBy: true },
      });
      if (policies.length !== ids.length) return { success: false, status: 404 };

      for (const policy of policies) {
        await transaction.policy.updateMany({
          where: {
            ...where,
            id: policy.id,
            NOT: { signedBy: { has: member.id } },
          },
          data: { signedBy: { push: member.id } },
        });
      }
      return {
        success: true,
        alreadySigned: policies.every((policy) => policy.signedBy.includes(member.id)),
      };
    },
    { isolationLevel: 'Serializable' },
  );
}
