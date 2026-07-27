import { db } from '@db';
import type { Impact, Likelihood, Prisma } from '@db';
import { LEVEL_LABEL, ratingLevel } from '../../risks/risk-level';
import { formatExportDate } from '../utils/export-shared';
import type {
  AcceptanceExportState,
  RiskTreatmentExportRow,
  VendorTreatmentExportRow,
} from './types';

/**
 * Live platform data the Risk Treatment Plan (6.1.3) renders from: the Risk
 * Register (all non-archived risks), every vendor's risk fields, and the
 * latest acceptance event per subject. Loaded at export-input assembly for
 * BOTH snapshot sites (buildDraftSnapshot + createPublishedVersion), so a
 * published version freezes the rows as they stood at approval.
 */
export interface RiskTreatmentExtras {
  risks: RiskTreatmentExportRow[];
  vendors: VendorTreatmentExportRow[];
}

interface LatestAcceptance {
  acceptedByName: string;
  residualLikelihood: Likelihood;
  residualImpact: Impact;
  createdAt: Date;
}

/** "vendor_management" -> "Vendor management" (shared enum humanizer). */
function humanizeEnum(value: string): string {
  const spaced = value.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function levelLabel(likelihood: Likelihood, impact: Impact): string {
  return LEVEL_LABEL[ratingLevel(likelihood, impact)];
}

function ownerName(
  assignee: { user: { name: string | null; email: string } } | null,
): string {
  if (!assignee) return '—';
  return assignee.user.name?.trim() || assignee.user.email;
}

/**
 * Resolve the acceptance cell + state for a subject. An acceptance is stale
 * the moment the live residual rating differs from the rating frozen on the
 * latest acceptance event (6.1.3(f) — re-acceptance required).
 */
function resolveAcceptance({
  latest,
  residualLikelihood,
  residualImpact,
}: {
  latest: LatestAcceptance | undefined;
  residualLikelihood: Likelihood;
  residualImpact: Impact;
}): { acceptance: string; acceptanceState: AcceptanceExportState } {
  if (!latest) {
    return { acceptance: 'Awaiting acceptance', acceptanceState: 'awaiting' };
  }
  const stale =
    latest.residualLikelihood !== residualLikelihood ||
    latest.residualImpact !== residualImpact;
  if (stale) {
    return {
      acceptance: `Stale — accepted ${formatExportDate(latest.createdAt)} (${latest.acceptedByName}); residual has changed since`,
      acceptanceState: 'stale',
    };
  }
  return {
    acceptance: `Accepted ${formatExportDate(latest.createdAt)} (${latest.acceptedByName})`,
    acceptanceState: 'accepted',
  };
}

export async function loadRiskTreatmentExtras({
  organizationId,
  client,
}: {
  organizationId: string;
  client?: Prisma.TransactionClient;
}): Promise<RiskTreatmentExtras> {
  const dbc = client ?? db;
  const [risks, vendors, acceptances] = await Promise.all([
    // Archived risks are retired from the register and stay out of the plan.
    dbc.risk.findMany({
      where: { organizationId, status: { not: 'archived' } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        likelihood: true,
        impact: true,
        residualLikelihood: true,
        residualImpact: true,
        treatmentStrategy: true,
        treatmentStrategyDescription: true,
        assignee: { select: { user: { select: { name: true, email: true } } } },
      },
    }),
    dbc.vendor.findMany({
      where: { organizationId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        category: true,
        status: true,
        inherentProbability: true,
        inherentImpact: true,
        residualProbability: true,
        residualImpact: true,
        treatmentStrategy: true,
        treatmentStrategyDescription: true,
        assignee: { select: { user: { select: { name: true, email: true } } } },
      },
    }),
    dbc.riskAcceptance.findMany({
      where: { organizationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        riskId: true,
        vendorId: true,
        acceptedByName: true,
        residualLikelihood: true,
        residualImpact: true,
        createdAt: true,
      },
    }),
  ]);

  // Newest-first order means the first acceptance seen per subject is the latest.
  const latestByRisk = new Map<string, LatestAcceptance>();
  const latestByVendor = new Map<string, LatestAcceptance>();
  for (const acceptance of acceptances) {
    if (acceptance.riskId && !latestByRisk.has(acceptance.riskId)) {
      latestByRisk.set(acceptance.riskId, acceptance);
    }
    if (acceptance.vendorId && !latestByVendor.has(acceptance.vendorId)) {
      latestByVendor.set(acceptance.vendorId, acceptance);
    }
  }

  return {
    risks: risks.map((risk, index) => ({
      reference: `R-${String(index + 1).padStart(2, '0')}`,
      title: risk.title,
      category: humanizeEnum(risk.category),
      inherentLevel: levelLabel(risk.likelihood, risk.impact),
      treatment: humanizeEnum(risk.treatmentStrategy),
      controls: risk.treatmentStrategyDescription?.trim() || '—',
      ownerName: ownerName(risk.assignee),
      residualLevel: levelLabel(risk.residualLikelihood, risk.residualImpact),
      ...resolveAcceptance({
        latest: latestByRisk.get(risk.id),
        residualLikelihood: risk.residualLikelihood,
        residualImpact: risk.residualImpact,
      }),
      status: humanizeEnum(risk.status),
    })),
    vendors: vendors.map((vendor) => ({
      name: vendor.name,
      category: humanizeEnum(vendor.category),
      inherentLevel: levelLabel(vendor.inherentProbability, vendor.inherentImpact),
      treatment: humanizeEnum(vendor.treatmentStrategy),
      controls: vendor.treatmentStrategyDescription?.trim() || '—',
      ownerName: ownerName(vendor.assignee),
      residualLevel: levelLabel(
        vendor.residualProbability,
        vendor.residualImpact,
      ),
      ...resolveAcceptance({
        latest: latestByVendor.get(vendor.id),
        residualLikelihood: vendor.residualProbability,
        residualImpact: vendor.residualImpact,
      }),
      status: humanizeEnum(vendor.status),
    })),
  };
}
