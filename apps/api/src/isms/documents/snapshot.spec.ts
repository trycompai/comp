import { diffPlatformSnapshots, parsePlatformSnapshot } from './snapshot';
import type { IsmsPlatformData } from './types';

const base: IsmsPlatformData = {
  organizationName: 'Acme',
  frameworkNames: ['ISO 27001'],
  vendorCount: 3,
  subProcessorCount: 1,
  vendorsByCategory: { cloud: 3 },
  subProcessorNames: ['Sub A'],
  infraVendorNames: ['Cloud A'],
  memberCount: 5,
  membersByDepartment: { it: 5 },
  deviceCount: 4,
  riskCount: 2,
  highRiskCount: 1,
  hasTrainingProgram: true,
};

describe('diffPlatformSnapshots', () => {
  it('flags no-baseline when previous is null', () => {
    const result = diffPlatformSnapshots({
      type: 'context_of_organization',
      previous: null,
      current: base,
    });
    expect(result.isStale).toBe(true);
    expect(result.changedSources).toEqual(['no-baseline']);
  });

  it('reports not stale when nothing relevant changed', () => {
    const result = diffPlatformSnapshots({
      type: 'objectives_plan',
      previous: base,
      current: base,
    });
    expect(result.isStale).toBe(false);
    expect(result.changedSources).toHaveLength(0);
  });

  it('only reports sources the objectives doc derives from (risk drift)', () => {
    const result = diffPlatformSnapshots({
      type: 'objectives_plan',
      previous: base,
      current: { ...base, riskCount: 9, deviceCount: 99 },
    });
    expect(result.changedSources).toContain('risks');
    // objectives_plan does not derive from devices.
    expect(result.changedSources).not.toContain('devices');
  });

  it('detects framework drift regardless of order', () => {
    const same = diffPlatformSnapshots({
      type: 'isms_scope',
      previous: { ...base, frameworkNames: ['ISO 27001', 'SOC 2'] },
      current: { ...base, frameworkNames: ['SOC 2', 'ISO 27001'] },
    });
    expect(same.isStale).toBe(false);
  });

  it('leadership only drifts on organization name', () => {
    const noChange = diffPlatformSnapshots({
      type: 'leadership_commitment',
      previous: base,
      current: { ...base, vendorCount: 99 },
    });
    expect(noChange.isStale).toBe(false);

    const renamed = diffPlatformSnapshots({
      type: 'leadership_commitment',
      previous: base,
      current: { ...base, organizationName: 'NewCo' },
    });
    expect(renamed.changedSources).toContain('organizationName');
  });
});

describe('parsePlatformSnapshot', () => {
  it('round-trips a serialized snapshot', () => {
    const parsed = parsePlatformSnapshot(JSON.parse(JSON.stringify(base)));
    expect(parsed).toEqual(base);
  });

  it('returns null for non-object / missing frameworkNames', () => {
    expect(parsePlatformSnapshot(null)).toBeNull();
    expect(parsePlatformSnapshot([1, 2])).toBeNull();
    expect(parsePlatformSnapshot({ foo: 'bar' })).toBeNull();
  });
});
