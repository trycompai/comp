import { describe, expect, it } from 'vitest';
import type { IsmsMetric } from '../isms-types';
import { buildMeasurementsCsv, measurementsCsvFilename } from './monitoring-csv';

const metric: IsmsMetric = {
  id: 'met_1',
  metricKey: 'uptime',
  name: 'Production availability / uptime',
  whatIsMeasured: 'Availability.',
  method: 'Uptime reports.',
  cadence: 'monthly',
  monitorMemberId: null,
  analyzeMemberId: null,
  target: null,
  objectiveId: null,
  objective: null,
  dataSource: 'manual',
  isActive: true,
  source: 'derived',
  derivedFrom: 'seed:uptime',
  position: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  measurements: [
    {
      id: 'msr_2',
      metricId: 'met_1',
      periodStart: '2026-07-01',
      value: '99.95%',
      note: 'includes, comma',
      recordedAt: '2026-07-20T10:00:00.000Z',
      enteredById: 'mem_1',
      source: 'manual',
    },
    {
      id: 'msr_1',
      metricId: 'met_1',
      periodStart: '2026-06-01',
      value: '=SUM(A1)', // formula-injection attempt
      note: null,
      recordedAt: '2026-07-02T09:00:00.000Z',
      enteredById: null,
      source: 'manual',
    },
  ],
};

describe('buildMeasurementsCsv', () => {
  const csv = buildMeasurementsCsv({
    metric,
    memberNames: { mem_1: 'Jane Doe' },
  });
  const lines = csv.split('\r\n');

  it('starts with a UTF-8 BOM and the header row', () => {
    expect(csv.startsWith('﻿')).toBe(true);
    expect(lines[0].replace('﻿', '')).toBe(
      'Metric,Period covered,Period start,Value,Recorded on,Entered by,Source,Note',
    );
  });

  it('renders one row per measurement with period labels and entered-by names', () => {
    expect(lines[1]).toContain('July 2026');
    expect(lines[1]).toContain('2026-07-01');
    expect(lines[1]).toContain('99.95%');
    expect(lines[1]).toContain('2026-07-20');
    expect(lines[1]).toContain('Jane Doe');
    // Note with a comma is quoted per RFC 4180.
    expect(lines[1]).toContain('"includes, comma"');
  });

  it('neutralizes formula-injection values', () => {
    expect(lines[2]).toContain("'=SUM(A1)");
  });
});

describe('measurementsCsvFilename', () => {
  it('slugifies the metric name and stamps the date', () => {
    expect(measurementsCsvFilename(metric, new Date('2026-07-20T12:00:00Z'))).toBe(
      'production-availability-uptime-measurements-2026-07-20.csv',
    );
  });
});
