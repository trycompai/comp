import { db } from '@db';
import type { IsmsPlatformData } from './types';

const CLOUD_CATEGORIES = ['cloud', 'infrastructure', 'software_as_a_service'];
const HIGH_LIKELIHOOD = ['likely', 'very_likely'];
const HIGH_IMPACT = ['major', 'severe'];

/**
 * Reads all platform data used to derive the ISMS foundational documents for a
 * single organization. Always scoped by organizationId. The returned shape is
 * the raw snapshot — derivation logic lives in the per-document handlers so this
 * file only owns the queries.
 */
export async function collectPlatformData({
  organizationId,
  frameworkId,
}: {
  organizationId: string;
  frameworkId: string;
}): Promise<IsmsPlatformData> {
  const [
    organization,
    frameworkInstances,
    vendors,
    memberCount,
    membersGrouped,
    deviceCount,
    risks,
    trainingCompletionCount,
    ownFramework,
  ] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
    db.frameworkInstance.findMany({
      where: { organizationId },
      select: { framework: { select: { name: true } } },
    }),
    db.vendor.findMany({
      where: { organizationId },
      select: { name: true, category: true, isSubProcessor: true },
    }),
    db.member.count({ where: { organizationId, deactivated: false } }),
    db.member.groupBy({
      by: ['department'],
      where: { organizationId, deactivated: false },
      _count: { _all: true },
    }),
    db.device.count({ where: { organizationId } }),
    db.risk.findMany({
      where: { organizationId },
      select: { residualLikelihood: true, residualImpact: true },
    }),
    db.employeeTrainingVideoCompletion.count({
      where: { member: { organizationId } },
    }),
    db.frameworkEditorFramework.findUnique({
      where: { id: frameworkId },
      select: { name: true },
    }),
  ]);

  const frameworkNames = new Set<string>();
  for (const instance of frameworkInstances) {
    if (instance.framework?.name) frameworkNames.add(instance.framework.name);
  }
  if (ownFramework?.name) frameworkNames.add(ownFramework.name);

  const vendorsByCategory: Record<string, number> = {};
  const subProcessorNames: string[] = [];
  const infraVendorNames: string[] = [];
  for (const vendor of vendors) {
    vendorsByCategory[vendor.category] =
      (vendorsByCategory[vendor.category] ?? 0) + 1;
    if (vendor.isSubProcessor) subProcessorNames.push(vendor.name);
    if (CLOUD_CATEGORIES.includes(vendor.category)) {
      infraVendorNames.push(vendor.name);
    }
  }

  const membersByDepartment: Record<string, number> = {};
  for (const row of membersGrouped) {
    membersByDepartment[row.department] = row._count._all;
  }

  const highRiskCount = risks.filter(
    (risk) =>
      HIGH_LIKELIHOOD.includes(risk.residualLikelihood) &&
      HIGH_IMPACT.includes(risk.residualImpact),
  ).length;

  return {
    organizationName: organization?.name ?? 'The organization',
    frameworkNames: Array.from(frameworkNames).sort(),
    vendorCount: vendors.length,
    subProcessorCount: subProcessorNames.length,
    vendorsByCategory,
    subProcessorNames: subProcessorNames.sort(),
    infraVendorNames: infraVendorNames.sort(),
    memberCount,
    membersByDepartment,
    deviceCount,
    riskCount: risks.length,
    highRiskCount,
    hasTrainingProgram: trainingCompletionCount > 0,
  };
}
