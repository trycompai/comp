import { db } from '@db';
import type { ContextDerivationInput } from './context-derivation';

/**
 * Reads the platform data used to derive Context-of-the-Organization issues for a
 * single organization. Always scoped by organizationId. The returned shape is the
 * raw snapshot — derivation and drift logic live in context-derivation.ts so this
 * file only owns the queries.
 */
export async function collectContextData({
  organizationId,
  frameworkId,
}: {
  organizationId: string;
  frameworkId: string;
}): Promise<ContextDerivationInput> {
  const [
    frameworkInstances,
    vendorCount,
    subProcessorCount,
    vendorsGrouped,
    memberCount,
    membersGrouped,
    deviceCount,
  ] = await Promise.all([
    db.frameworkInstance.findMany({
      where: { organizationId },
      select: { framework: { select: { name: true } } },
    }),
    db.vendor.count({ where: { organizationId } }),
    db.vendor.count({ where: { organizationId, isSubProcessor: true } }),
    db.vendor.groupBy({
      by: ['category'],
      where: { organizationId },
      _count: { _all: true },
    }),
    db.member.count({ where: { organizationId, deactivated: false } }),
    db.member.groupBy({
      by: ['department'],
      where: { organizationId, deactivated: false },
      _count: { _all: true },
    }),
    db.device.count({ where: { organizationId } }),
  ]);

  // Ensure the document's own framework is represented even if no instance exists yet.
  const frameworkNames = new Set<string>();
  for (const instance of frameworkInstances) {
    if (instance.framework?.name) {
      frameworkNames.add(instance.framework.name);
    }
  }
  const ownFramework = await db.frameworkEditorFramework.findUnique({
    where: { id: frameworkId },
    select: { name: true },
  });
  if (ownFramework?.name) {
    frameworkNames.add(ownFramework.name);
  }

  const vendorsByCategory: Record<string, number> = {};
  for (const row of vendorsGrouped) {
    vendorsByCategory[row.category] = row._count._all;
  }

  const membersByDepartment: Record<string, number> = {};
  for (const row of membersGrouped) {
    membersByDepartment[row.department] = row._count._all;
  }

  return {
    frameworkNames: Array.from(frameworkNames).sort(),
    vendorCount,
    subProcessorCount,
    vendorsByCategory,
    memberCount,
    membersByDepartment,
    deviceCount,
  };
}
