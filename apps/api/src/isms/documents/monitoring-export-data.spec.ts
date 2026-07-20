import { db } from '@db';
import {
  loadMonitoringExtras,
  mapMetrics,
  type MetricWithExportIncludes,
} from './monitoring-export-data';

jest.mock('@db', () => ({
  db: {
    member: { findMany: jest.fn() },
    ismsRole: { findFirst: jest.fn() },
  },
}));

const mockDb = jest.mocked(db);

const baseMetric = {
  id: 'met_1',
  documentId: 'doc_1',
  metricKey: 'uptime',
  name: 'Production availability / uptime',
  whatIsMeasured: 'Availability of production services.',
  method: 'Cloud monitoring uptime reports.',
  cadence: 'monthly',
  monitorMemberId: null,
  analyzeMemberId: null,
  target: '≥ 99.9% availability',
  objectiveId: null,
  objective: null,
  dataSource: 'manual',
  isActive: true,
  source: 'derived',
  derivedFrom: 'seed:uptime',
  position: 0,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  measurements: [],
} as unknown as MetricWithExportIncludes;

describe('loadMonitoringExtras', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves member names and the SPO fallback display', async () => {
    (mockDb.member.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'mem_1',
        deactivated: false,
        user: { name: 'Jane Doe', email: 'jane@x.io' },
      },
      {
        id: 'mem_2',
        deactivated: true,
        user: { name: null, email: 'gone@x.io' },
      },
    ]);
    (mockDb.ismsRole.findFirst as jest.Mock).mockResolvedValue({
      assignments: [{ memberId: 'mem_1' }, { memberId: 'mem_2' }],
    });

    const extras = await loadMonitoringExtras({ organizationId: 'org_1' });

    expect(extras.memberNames).toEqual({
      mem_1: 'Jane Doe',
      mem_2: 'gone@x.io',
    });
    // Deactivated SPO assignee is excluded from the fallback display.
    expect(extras.spoDisplay).toBe('Security & Privacy Owner (Jane Doe)');
  });

  it('falls back to the plain role label when the SPO is unassigned', async () => {
    (mockDb.member.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.ismsRole.findFirst as jest.Mock).mockResolvedValue(null);

    const extras = await loadMonitoringExtras({ organizationId: 'org_1' });
    expect(extras.spoDisplay).toBe('Security & Privacy Owner (SPO)');
  });
});

describe('mapMetrics', () => {
  const extras = {
    memberNames: { mem_1: 'Jane Doe' },
    spoDisplay: 'Security & Privacy Owner (SPO)',
  };

  it('excludes deactivated metrics from the published framework table', () => {
    const rows = mapMetrics(
      [baseMetric, { ...baseMetric, id: 'met_2', isActive: false }],
      extras,
    );
    expect(rows).toHaveLength(1);
  });

  it('resolves people: explicit member name, SPO fallback for null', () => {
    const rows = mapMetrics(
      [{ ...baseMetric, monitorMemberId: 'mem_1', analyzeMemberId: null }],
      extras,
    );
    expect(rows[0].monitorName).toBe('Jane Doe');
    expect(rows[0].analyzeName).toBe('Security & Privacy Owner (SPO)');
  });

  it('renders the latest value with its period label', () => {
    const rows = mapMetrics(
      [
        {
          ...baseMetric,
          measurements: [
            {
              periodStart: new Date('2026-07-01T00:00:00Z'),
              value: '99.95%',
            },
          ] as MetricWithExportIncludes['measurements'],
        },
      ],
      extras,
    );
    expect(rows[0].currentValue).toBe('99.95% (July 2026)');
  });

  it('renders an em-dash when the metric has no measurements', () => {
    expect(mapMetrics([baseMetric], extras)[0].currentValue).toBe('—');
  });

  it('prefers explicit target text, else the linked objective target', () => {
    const withObjective = {
      ...baseMetric,
      target: null,
      objective: { objective: 'Maintain uptime', target: '99.9% SLA' },
    } as unknown as MetricWithExportIncludes;
    expect(mapMetrics([withObjective], extras)[0].target).toBe('99.9% SLA');

    const explicitWins = {
      ...withObjective,
      target: 'Explicit target',
    } as unknown as MetricWithExportIncludes;
    expect(mapMetrics([explicitWins], extras)[0].target).toBe(
      'Explicit target',
    );
  });

  it('humanizes the cadence', () => {
    expect(mapMetrics([baseMetric], extras)[0].cadence).toBe('Monthly');
    expect(
      mapMetrics([{ ...baseMetric, cadence: null }], extras)[0].cadence,
    ).toBeNull();
  });
});
