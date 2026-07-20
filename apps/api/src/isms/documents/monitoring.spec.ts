import type { Prisma } from '@db';
import {
  buildMonitoringSections,
  metricValidationMessages,
  seedMetricsIfMissing,
} from './monitoring';
import { SEED_METRIC_DEFINITIONS } from './monitoring-defaults';
import type { MetricExportRow } from './types';

describe('metricValidationMessages (clause 9.1 submit gate)', () => {
  it('requires at least one active metric', () => {
    expect(metricValidationMessages({ metrics: [] })).toEqual([
      'At least one metric must be active.',
    ]);
    expect(
      metricValidationMessages({
        metrics: [{ name: 'Uptime', cadence: 'monthly', isActive: false }],
      }),
    ).toEqual(['At least one metric must be active.']);
  });

  it('requires a cadence on every ACTIVE metric only', () => {
    const messages = metricValidationMessages({
      metrics: [
        { name: 'Uptime', cadence: 'monthly', isActive: true },
        { name: 'Custom A', cadence: null, isActive: true },
        { name: 'Custom B', cadence: null, isActive: false }, // inactive: exempt
      ],
    });
    expect(messages).toEqual(['"Custom A" needs a cadence.']);
  });

  it('passes with one active metric that has a cadence', () => {
    expect(
      metricValidationMessages({
        metrics: [{ name: 'Uptime', cadence: 'monthly', isActive: true }],
      }),
    ).toEqual([]);
  });
});

describe('seedMetricsIfMissing', () => {
  const makeTx = (existing: Array<{ metricKey: string | null; position: number }>) => {
    const tx = {
      ismsMetric: {
        findMany: jest.fn().mockResolvedValue(existing),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    return tx as unknown as Prisma.TransactionClient & typeof tx;
  };

  it('seeds all nine defaults into an empty document', async () => {
    const tx = makeTx([]);
    await seedMetricsIfMissing({ tx, documentId: 'doc_1' });

    const { data, skipDuplicates } = (
      tx.ismsMetric.createMany as jest.Mock
    ).mock.calls[0][0];
    expect(skipDuplicates).toBe(true);
    expect(data).toHaveLength(9);
    expect(data.map((row: { metricKey: string }) => row.metricKey)).toEqual(
      SEED_METRIC_DEFINITIONS.map((metric) => metric.metricKey),
    );
    // People deliberately unassigned: null means "defaults to the SPO".
    expect(data[0]).toMatchObject({
      documentId: 'doc_1',
      source: 'derived',
      derivedFrom: `seed:${SEED_METRIC_DEFINITIONS[0].metricKey}`,
      position: 0,
    });
    expect(data[0].monitorMemberId).toBeUndefined();
  });

  it('creates only the missing seeds, after existing positions', async () => {
    const tx = makeTx([
      { metricKey: 'training_completion', position: 0 },
      { metricKey: null, position: 5 }, // custom metric
    ]);
    await seedMetricsIfMissing({ tx, documentId: 'doc_1' });

    const { data } = (tx.ismsMetric.createMany as jest.Mock).mock.calls[0][0];
    expect(data).toHaveLength(8);
    expect(
      data.map((row: { metricKey: string }) => row.metricKey),
    ).not.toContain('training_completion');
    expect(data[0].position).toBe(6);
  });

  it('is a no-op when every seed already exists (never deletes/overwrites)', async () => {
    const tx = makeTx(
      SEED_METRIC_DEFINITIONS.map((metric, index) => ({
        metricKey: metric.metricKey,
        position: index,
      })),
    );
    await seedMetricsIfMissing({ tx, documentId: 'doc_1' });
    expect(tx.ismsMetric.createMany).not.toHaveBeenCalled();
  });
});

describe('buildMonitoringSections', () => {
  const metric: MetricExportRow = {
    metricKey: 'uptime',
    name: 'Production availability / uptime',
    whatIsMeasured: 'Availability of production services over the period.',
    method: 'Cloud monitoring uptime reports.',
    cadence: 'Monthly',
    monitorName: 'Security & Privacy Owner (SPO)',
    analyzeName: 'Jane Doe',
    target: '≥ 99.9% availability',
    currentValue: '99.95% (July 2026)',
  };

  it('renders the five ticket sections in order', () => {
    const sections = buildMonitoringSections({
      contextIssues: [],
      interestedParties: [],
      requirements: [],
      objectives: [],
      narrative: null,
      metrics: [metric],
    });
    expect(sections.map((section) => section.heading)).toEqual([
      'Purpose',
      'Scope of what is measured',
      'Metrics, responsibilities, and cadence',
      'Analysis, evaluation, and reporting',
      'Sign-off',
    ]);
  });

  it('renders one metrics-table row per metric with the 9.1(a)-(f) columns', () => {
    const sections = buildMonitoringSections({
      contextIssues: [],
      interestedParties: [],
      requirements: [],
      objectives: [],
      narrative: null,
      metrics: [metric],
    });
    const table = sections[2].table;
    expect(table?.headers).toEqual([
      'What is measured',
      'Method',
      'Cadence',
      'Who monitors',
      'Who analyses',
      'Target',
      'Current value',
    ]);
    expect(table?.rows).toEqual([
      [
        'Availability of production services over the period.',
        'Cloud monitoring uptime reports.',
        'Monthly',
        'Security & Privacy Owner (SPO)',
        'Jane Doe',
        '≥ 99.9% availability',
        '99.95% (July 2026)',
      ],
    ]);
  });

  it('shows the empty text when no metrics are provided', () => {
    const sections = buildMonitoringSections({
      contextIssues: [],
      interestedParties: [],
      requirements: [],
      objectives: [],
      narrative: null,
    });
    expect(sections[2].emptyText).toBe('No active metrics recorded.');
    expect(sections[2].table?.rows).toEqual([]);
  });

  it('falls back to the metric name and em-dashes for blank fields', () => {
    const sections = buildMonitoringSections({
      contextIssues: [],
      interestedParties: [],
      requirements: [],
      objectives: [],
      narrative: null,
      metrics: [
        {
          ...metric,
          whatIsMeasured: '',
          cadence: null,
          target: '',
        },
      ],
    });
    const row = sections[2].table?.rows[0];
    expect(row?.[0]).toBe('Production availability / uptime');
    expect(row?.[2]).toBe('—');
    expect(row?.[5]).toBe('—');
  });
});
