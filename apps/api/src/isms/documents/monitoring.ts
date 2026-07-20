import type { Prisma } from '@db';
import type { IsmsExportSection } from '../utils/export-shared';
import type { DocumentExportInput } from './types';
import { SEED_METRIC_DEFINITIONS } from './monitoring-defaults';

type Tx = Prisma.TransactionClient;

/**
 * Clause-9.1 completeness check, shared by the submit-for-approval server gate
 * and the client Submit button (monitoring-constants.ts mirrors it). The ticket
 * requires only: at least one active metric, and a cadence on every active
 * metric. Everything else is optional. Returns unmet requirements; empty = ready.
 */
export function metricValidationMessages({
  metrics,
}: {
  metrics: Array<{ name: string; cadence: string | null; isActive: boolean }>;
}): string[] {
  const active = metrics.filter((metric) => metric.isActive);
  if (active.length === 0) {
    return ['At least one metric must be active.'];
  }
  return active
    .filter((metric) => !metric.cadence)
    .map((metric) => `"${metric.name}" needs a cadence.`);
}

/**
 * Seed the nine default metrics for a Monitoring document, idempotently by
 * `metricKey`. Only creates seed metrics that are missing — it NEVER deletes or
 * overwrites, so a regenerate can never clobber the customer's edits,
 * deactivations, or measurement history (same guarantee as seedRolesIfMissing;
 * the destructive derived-row replace would cascade-delete IsmsMeasurement).
 * Safe to call at document creation and on every generate.
 *
 * "Who monitors" / "Who analyses" are deliberately left null: null means
 * "defaults to the SPO", resolved to the SPO role holder's name at display and
 * export time. Seeding a member id here would be wrong — at provision time the
 * SPO role usually has no assignee yet.
 */
export async function seedMetricsIfMissing({
  tx,
  documentId,
}: {
  tx: Tx;
  documentId: string;
}): Promise<void> {
  const existing = await tx.ismsMetric.findMany({
    where: { documentId },
    select: { metricKey: true, position: true },
  });
  const existingKeys = new Set(
    existing
      .map((metric) => metric.metricKey)
      .filter((key): key is string => !!key),
  );
  const missing = SEED_METRIC_DEFINITIONS.filter(
    (metric) => !existingKeys.has(metric.metricKey),
  );
  if (missing.length === 0) return;

  const maxPosition = existing.reduce(
    (max, metric) => Math.max(max, metric.position),
    -1,
  );

  await tx.ismsMetric.createMany({
    data: missing.map((metric, index) => ({
      documentId,
      metricKey: metric.metricKey,
      name: metric.name,
      whatIsMeasured: metric.whatIsMeasured,
      method: metric.method,
      cadence: metric.cadence,
      target: metric.target,
      source: 'derived' as const,
      derivedFrom: `seed:${metric.metricKey}`,
      position: maxPosition + 1 + index,
    })),
    // Belt-and-braces with @@unique([documentId, metricKey]): a concurrent
    // provision/generate racing this seed is absorbed silently.
    skipDuplicates: true,
  });
}

// ---- Export section builder -------------------------------------------------

/**
 * Build the Monitoring, Measurement, Analysis & Evaluation Framework document
 * (clause 9.1). Contents and order follow the CS-723 ticket: Purpose, Scope,
 * Metrics table, Analysis and reporting, Sign-off. `metrics` (active only,
 * people and current values already resolved) is populated by
 * loadMonitoringExtras at export-input assembly (see monitoring-export-data.ts).
 * Historical values are deliberately NOT rendered — the document points to the
 * platform's per-metric history, exportable to CSV for auditor sampling.
 */
export function buildMonitoringSections(
  input: DocumentExportInput,
): IsmsExportSection[] {
  const metrics = input.metrics ?? [];

  return [
    {
      heading: 'Purpose',
      paragraphs: [
        {
          text: 'This framework defines how the organisation monitors, measures, analyses, and evaluates the performance and effectiveness of its information security processes, controls, and the Information Security Management System (ISMS) as a whole, in accordance with ISO/IEC 27001:2022, Clause 9.1. For each metric it records what is measured, the method, the cadence, who monitors, and who analyses and evaluates the results.',
        },
      ],
    },
    {
      heading: 'Scope of what is measured',
      intro: 'The framework covers, at minimum:',
      bullets: [
        'Effectiveness of the information security controls in the Statement of Applicability (SoA).',
        'Performance of key information security processes (access management, vulnerability management, incident response, vendor management, training, and availability).',
        'Progress against the information security objectives recorded in the Information Security Objectives and Plan.',
        'Overall effectiveness of the ISMS.',
      ],
    },
    {
      heading: 'Metrics, responsibilities, and cadence',
      intro:
        'For each metric the framework records what is measured, the method, the cadence, who monitors, who analyses, the target, and the current (most recent) value — as required by Clause 9.1(a)–(f). Measurement history is retained in Comp AI per metric and is exportable to CSV for auditor sampling.',
      emptyText: 'No active metrics recorded.',
      table: {
        headers: [
          'What is measured',
          'Method',
          'Cadence',
          'Who monitors',
          'Who analyses',
          'Target',
          'Current value',
        ],
        rows: metrics.map((metric) => [
          metric.whatIsMeasured || metric.name,
          metric.method,
          metric.cadence ?? '—',
          metric.monitorName,
          metric.analyzeName,
          metric.target || '—',
          metric.currentValue,
        ]),
      },
    },
    {
      heading: 'Analysis, evaluation, and reporting',
      paragraphs: [
        {
          text: 'The Security & Privacy Owner consolidates the recorded measurements into a security performance report and evaluates each metric against its target. Where a metric is off-target, a corrective action is raised with an owner and a due date. The consolidated report is an input to the Management Review.',
        },
        {
          text: 'Measurement results, analysis, and evaluation are retained as documented information in Comp AI to provide evidence of monitoring and to support audit sampling. Each measurement records the period it covers, the value, who entered it, and an immutable "recorded on" date.',
        },
      ],
    },
    {
      heading: 'Sign-off',
      paragraphs: [
        {
          text: 'This framework is owned by the Security & Privacy Owner and is reviewed at least annually and when the metric set, objectives, or tooling materially change. The approver and approval date are recorded in the document control table above.',
        },
      ],
    },
  ];
}
