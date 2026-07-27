import { createHash } from 'node:crypto';
import { db } from '@db';
import type { Prisma } from '@db';
import { parseStoredAnswers } from '../wizard/wizard-schema';
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
  client,
}: {
  organizationId: string;
  frameworkId: string;
  /**
   * Optional transaction client. The approval flow passes its transaction so
   * the drift baseline is read at the SAME point in time as the rows frozen
   * into the published version — otherwise a concurrent edit between the two
   * reads makes a just-approved document immediately show as stale.
   */
  client?: Prisma.TransactionClient;
}): Promise<IsmsPlatformData> {
  const dbc = client ?? db;
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
    profile,
    partiesRows,
    acceptanceRows,
  ] = await Promise.all([
    dbc.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
    dbc.frameworkInstance.findMany({
      where: { organizationId },
      select: { framework: { select: { name: true } } },
    }),
    dbc.vendor.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        category: true,
        isSubProcessor: true,
        // Risk fields feed the Risk Treatment Plan fingerprint (6.1.3).
        status: true,
        inherentProbability: true,
        inherentImpact: true,
        residualProbability: true,
        residualImpact: true,
        treatmentStrategy: true,
        treatmentStrategyDescription: true,
        assigneeId: true,
        assignee: { select: { user: { select: { name: true, email: true } } } },
      },
    }),
    dbc.member.count({ where: { organizationId, deactivated: false } }),
    dbc.member.groupBy({
      by: ['department'],
      where: { organizationId, deactivated: false },
      _count: { _all: true },
    }),
    dbc.device.count({ where: { organizationId } }),
    dbc.risk.findMany({
      where: { organizationId },
      select: {
        id: true,
        residualLikelihood: true,
        residualImpact: true,
        // The remaining fields feed the Risk Treatment Plan fingerprint (6.1.3).
        title: true,
        category: true,
        status: true,
        likelihood: true,
        impact: true,
        treatmentStrategy: true,
        treatmentStrategyDescription: true,
        assigneeId: true,
        assignee: { select: { user: { select: { name: true, email: true } } } },
      },
    }),
    dbc.employeeTrainingVideoCompletion.count({
      where: { member: { organizationId } },
    }),
    dbc.frameworkEditorFramework.findUnique({
      where: { id: frameworkId },
      select: { name: true },
    }),
    dbc.ismsProfile.findUnique({
      where: { organizationId_frameworkId: { organizationId, frameworkId } },
      select: { answers: true },
    }),
    dbc.ismsInterestedParty.findMany({
      where: {
        document: {
          organizationId,
          frameworkId,
          type: 'interested_parties_register',
        },
      },
      select: { id: true, name: true, category: true },
    }),
    dbc.riskAcceptance.findMany({
      where: { organizationId },
      select: { id: true, riskId: true, vendorId: true },
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
    organizationName: organization?.name?.trim() || 'The organization',
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
    wizardAnswers: parseStoredAnswers(profile?.answers),
    partiesFingerprint: fingerprintParties(partiesRows),
    riskTreatmentFingerprint: fingerprintRiskTreatment({
      risks,
      vendors,
      acceptances: acceptanceRows,
    }),
  };
}

/**
 * Stable, order-insensitive SHA-256 of the parties register rows. The
 * Requirements document derives one row per party, so a manual party edit (name
 * or category) — otherwise invisible to the platform snapshot — must change this
 * fingerprint and flag requirements drift. Each row is JSON-encoded (so field
 * boundaries can never collide) and the encoded rows are sorted, making the
 * result independent of row order.
 */
function fingerprintParties(
  rows: Array<{ id: string; name: string; category: string }>,
): string {
  if (rows.length === 0) return '';
  const canonical = rows
    .map((row) => JSON.stringify([row.id, row.name, row.category]))
    .sort()
    .join('');
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Stable, order-insensitive SHA-256 over everything the Risk Treatment Plan
 * (6.1.3) renders: non-archived Risk Register rows, vendor risk fields, and
 * acceptance events (append-only, so their ids alone capture "a new acceptance
 * was recorded"). Same canonicalization as fingerprintParties: JSON-encoded
 * rows, sorted, so field boundaries can't collide and row order is irrelevant.
 * Two subtleties: (1) archived risks leave the plan, so archiving changes the
 * row set (= drift) while later edits to an archived risk stay invisible —
 * acceptance rows are filtered to the RENDERED subjects for the same reason;
 * (2) the fingerprint carries the rendered owner DISPLAY value (not the id),
 * so a member rename that changes the exported owner cell also drifts.
 */
function fingerprintRiskTreatment({
  risks,
  vendors,
  acceptances,
}: {
  risks: Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    likelihood: string;
    impact: string;
    residualLikelihood: string;
    residualImpact: string;
    treatmentStrategy: string;
    treatmentStrategyDescription: string | null;
    assigneeId: string | null;
    assignee: { user: { name: string | null; email: string } } | null;
  }>;
  vendors: Array<{
    id: string;
    name: string;
    category: string;
    status: string;
    inherentProbability: string;
    inherentImpact: string;
    residualProbability: string;
    residualImpact: string;
    treatmentStrategy: string;
    treatmentStrategyDescription: string | null;
    assigneeId: string | null;
    assignee: { user: { name: string | null; email: string } } | null;
  }>;
  acceptances: Array<{
    id: string;
    riskId: string | null;
    vendorId: string | null;
  }>;
}): string {
  const ownerDisplay = (
    assignee: { user: { name: string | null; email: string } } | null,
  ): string => (assignee ? assignee.user.name?.trim() || assignee.user.email : '');
  const renderedRisks = risks.filter((risk) => risk.status !== 'archived');
  const renderedSubjectIds = new Set([
    ...renderedRisks.map((risk) => risk.id),
    ...vendors.map((vendor) => vendor.id),
  ]);
  const rows = [
    ...renderedRisks.map((risk) =>
      JSON.stringify([
        'risk',
        risk.id,
        risk.title,
        risk.category,
        risk.status,
        risk.likelihood,
        risk.impact,
        risk.residualLikelihood,
        risk.residualImpact,
        risk.treatmentStrategy,
        risk.treatmentStrategyDescription ?? '',
        risk.assigneeId ?? '',
        ownerDisplay(risk.assignee),
      ]),
    ),
    ...vendors.map((vendor) =>
      JSON.stringify([
        'vendor',
        vendor.id,
        vendor.name,
        vendor.category,
        vendor.status,
        vendor.inherentProbability,
        vendor.inherentImpact,
        vendor.residualProbability,
        vendor.residualImpact,
        vendor.treatmentStrategy,
        vendor.treatmentStrategyDescription ?? '',
        vendor.assigneeId ?? '',
        ownerDisplay(vendor.assignee),
      ]),
    ),
    ...acceptances
      .filter((acceptance) =>
        renderedSubjectIds.has(acceptance.riskId ?? acceptance.vendorId ?? ''),
      )
      .map((acceptance) =>
        JSON.stringify([
          'acceptance',
          acceptance.id,
          acceptance.riskId ?? '',
          acceptance.vendorId ?? '',
        ]),
      ),
  ];
  if (rows.length === 0) return '';
  return createHash('sha256').update(rows.sort().join('')).digest('hex');
}
