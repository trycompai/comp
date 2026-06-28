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
  wizardAnswers: {},
  partiesFingerprint: 'fp-base',
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

  it('detects vendor category mix drift for context (same total, different mix)', () => {
    const result = diffPlatformSnapshots({
      type: 'context_of_organization',
      previous: { ...base, vendorsByCategory: { cloud: 3 } },
      current: { ...base, vendorsByCategory: { cloud: 1, hr: 2 } },
    });
    expect(result.isStale).toBe(true);
    expect(result.changedSources).toContain('vendorMix');
    // The total count is unchanged, so the plain vendor source is not flagged.
    expect(result.changedSources).not.toContain('vendors');
  });

  it('detects department mix drift for context (same headcount, different mix)', () => {
    const result = diffPlatformSnapshots({
      type: 'context_of_organization',
      previous: { ...base, membersByDepartment: { it: 5 } },
      current: { ...base, membersByDepartment: { it: 2, hr: 3 } },
    });
    expect(result.changedSources).toContain('departmentMix');
    expect(result.changedSources).not.toContain('members');
  });

  it('ignores vendor/department mix key order', () => {
    const result = diffPlatformSnapshots({
      type: 'context_of_organization',
      previous: {
        ...base,
        vendorsByCategory: { cloud: 2, hr: 1 },
        membersByDepartment: { it: 3, hr: 2 },
      },
      current: {
        ...base,
        vendorsByCategory: { hr: 1, cloud: 2 },
        membersByDepartment: { hr: 2, it: 3 },
      },
    });
    expect(result.isStale).toBe(false);
  });

  it('detects member-count drift for objectives (6.2 uses memberCount)', () => {
    const result = diffPlatformSnapshots({
      type: 'objectives_plan',
      previous: base,
      current: { ...base, memberCount: 50 },
    });
    expect(result.changedSources).toContain('members');
  });

  it('detects wizard-answer drift for documents that derive from them', () => {
    const result = diffPlatformSnapshots({
      type: 'interested_parties_register',
      previous: { ...base, wizardAnswers: { hasContractors: false } },
      current: { ...base, wizardAnswers: { hasContractors: true } },
    });
    expect(result.isStale).toBe(true);
    expect(result.changedSources).toContain('wizardAnswers');
  });

  it('ignores wizard-answer key order', () => {
    const result = diffPlatformSnapshots({
      type: 'objectives_plan',
      previous: {
        ...base,
        wizardAnswers: { hasContractors: true, certificationBody: 'BSI' },
      },
      current: {
        ...base,
        wizardAnswers: { certificationBody: 'BSI', hasContractors: true },
      },
    });
    expect(result.isStale).toBe(false);
  });

  it('flags wizard drift for scope and leadership (both derive from wizard answers)', () => {
    for (const type of ['isms_scope', 'leadership_commitment'] as const) {
      const result = diffPlatformSnapshots({
        type,
        previous: { ...base, wizardAnswers: { hasContractors: false } },
        current: { ...base, wizardAnswers: { hasContractors: true } },
      });
      expect(result.changedSources).toContain('wizardAnswers');
    }
  });

  it('flags requirements drift when the parties register fingerprint changes', () => {
    const result = diffPlatformSnapshots({
      type: 'interested_parties_requirements',
      previous: base,
      current: { ...base, partiesFingerprint: 'fp-edited' },
    });
    expect(result.isStale).toBe(true);
    expect(result.changedSources).toContain('parties');
  });

  it('does not flag requirements drift when the parties fingerprint is unchanged', () => {
    const result = diffPlatformSnapshots({
      type: 'interested_parties_requirements',
      previous: base,
      current: base,
    });
    expect(result.isStale).toBe(false);
    expect(result.changedSources).not.toContain('parties');
  });

  it('only the requirements doc treats parties edits as drift', () => {
    for (const type of [
      'context_of_organization',
      'interested_parties_register',
      'objectives_plan',
      'isms_scope',
      'leadership_commitment',
    ] as const) {
      const result = diffPlatformSnapshots({
        type,
        previous: base,
        current: { ...base, partiesFingerprint: 'fp-edited' },
      });
      expect(result.changedSources).not.toContain('parties');
    }
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

  it('defaults partiesFingerprint to empty for legacy snapshots without it', () => {
    const { partiesFingerprint: _omit, ...legacy } = base;
    const parsed = parsePlatformSnapshot(JSON.parse(JSON.stringify(legacy)));
    expect(parsed?.partiesFingerprint).toBe('');
  });
});
