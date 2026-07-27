import { db } from '@db';
import type { Prisma } from '@db';
import { riskTreatmentValidationMessages } from './risk-treatment-plan';

/**
 * Clause-6.1.3 readiness: the RTP renders from the platform Risk Register +
 * Vendors (org-scoped), not from register rows of its own — so readiness reads
 * those tables. Archived risks are out of the plan (see
 * loadRiskTreatmentExtras). Shared by the submit gate and the page payload.
 */
export async function loadRiskTreatmentReadinessMessages({
  organizationId,
  client,
}: {
  organizationId: string;
  client?: Prisma.TransactionClient;
}): Promise<string[]> {
  const dbc = client ?? db;
  const [risks, vendors] = await Promise.all([
    dbc.risk.findMany({
      where: { organizationId, status: { not: 'archived' } },
      select: { assigneeId: true },
    }),
    dbc.vendor.findMany({
      where: { organizationId },
      select: { assigneeId: true },
    }),
  ]);
  return riskTreatmentValidationMessages({
    riskCount: risks.length,
    risksWithoutOwner: risks.filter((risk) => !risk.assigneeId).length,
    vendorsWithoutOwner: vendors.filter((vendor) => !vendor.assigneeId).length,
  });
}
