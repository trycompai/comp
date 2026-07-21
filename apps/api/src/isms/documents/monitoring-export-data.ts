import { db } from '@db';
import type { Prisma } from '@db';
import {
  periodLabel,
  toPeriodKey,
  type MetricCadenceValue,
} from '../utils/metric-periods';
import type { MetricExportRow } from './types';

/**
 * Extra data the Monitoring document (9.1) needs at export time but that isn't
 * on the metric rows: display names for the monitor/analyse members (metrics
 * store a plain memberId, no FK) and the SPO fallback label for unassigned
 * metrics (null memberId means "defaults to the SPO"). Resolved once and frozen
 * into the version snapshot so a historical export re-renders byte-faithfully
 * with the values and names that were current at publish.
 */
export interface MonitoringExtras {
  /** memberId → display name (name, else email, else a placeholder). */
  memberNames: Record<string, string>;
  /**
   * Rendered for metrics with no explicit monitor/analyse member:
   * "Security & Privacy Owner (Jane Doe)" when the SPO role has active
   * holders, else the plain role label.
   */
  spoDisplay: string;
}

type Client = Prisma.TransactionClient | typeof db;

function memberDisplayName(
  user: { name: string | null; email: string | null } | null,
): string {
  return user?.name?.trim() || user?.email?.trim() || 'Unknown member';
}

/** Load the Monitoring document's export extras for an organization. */
export async function loadMonitoringExtras({
  organizationId,
  client,
}: {
  organizationId: string;
  client?: Client;
}): Promise<MonitoringExtras> {
  const prisma = client ?? db;

  const [members, spoRole] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId },
      select: {
        id: true,
        deactivated: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.ismsRole.findFirst({
      where: {
        roleKey: 'spo',
        document: { organizationId, type: 'roles_and_responsibilities' },
      },
      select: { assignments: { select: { memberId: true } } },
    }),
  ]);

  const memberNames: Record<string, string> = {};
  const activeIds = new Set<string>();
  for (const member of members) {
    memberNames[member.id] = memberDisplayName(member.user);
    if (!member.deactivated) activeIds.add(member.id);
  }

  const spoHolders = (spoRole?.assignments ?? [])
    .filter((assignment) => activeIds.has(assignment.memberId))
    .map((assignment) => memberNames[assignment.memberId])
    .filter((name): name is string => !!name);

  return {
    memberNames,
    spoDisplay:
      spoHolders.length > 0
        ? `Security & Privacy Owner (${spoHolders.join(', ')})`
        : 'Security & Privacy Owner (SPO)',
  };
}

/** The metric shape mapMetrics consumes (EXPORT_DOCUMENT_INCLUDE's metrics). */
export type MetricWithExportIncludes = Prisma.IsmsMetricGetPayload<{
  include: {
    objective: { select: { objective: true; target: true } };
    measurements: true;
  };
}>;

const CADENCE_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

/** "99.95% (July 2026)" from the metric's most recent measurement, or "—". */
function currentValueText(metric: MetricWithExportIncludes): string {
  const latest = metric.measurements[0];
  if (!latest) return '—';
  const key = toPeriodKey(latest.periodStart);
  if (!key) return latest.value;
  const label = metric.cadence
    ? periodLabel(metric.cadence as MetricCadenceValue, key)
    : key;
  return `${latest.value} (${label})`;
}

/** The target column: explicit free text wins, else the linked objective. */
function targetText(metric: MetricWithExportIncludes): string {
  if (metric.target?.trim()) return metric.target;
  if (metric.objective) {
    return metric.objective.target || metric.objective.objective;
  }
  return '';
}

/**
 * Map ACTIVE metric rows into export rows, resolving people and the current
 * value. Deactivated metrics keep their history in the platform but are not
 * part of the published framework document.
 */
export function mapMetrics(
  metrics: MetricWithExportIncludes[],
  extras: MonitoringExtras,
): MetricExportRow[] {
  const personName = (memberId: string | null): string => {
    if (!memberId) return extras.spoDisplay;
    return extras.memberNames[memberId] ?? 'Former member';
  };

  return metrics
    .filter((metric) => metric.isActive)
    .map((metric) => ({
      metricKey: metric.metricKey,
      name: metric.name,
      whatIsMeasured: metric.whatIsMeasured,
      method: metric.method,
      cadence: metric.cadence ? (CADENCE_LABELS[metric.cadence] ?? null) : null,
      monitorName: personName(metric.monitorMemberId),
      analyzeName: personName(metric.analyzeMemberId),
      target: targetText(metric),
      currentValue: currentValueText(metric),
    }));
}
