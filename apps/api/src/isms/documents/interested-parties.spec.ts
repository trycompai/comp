import {
  buildInterestedPartiesSections,
  deriveInterestedParties,
} from './interested-parties';
import type { DocumentExportInput, IsmsPlatformData } from './types';

const data: IsmsPlatformData = {
  organizationName: 'Acme',
  frameworkNames: ['ISO 27001', 'GDPR'],
  vendorCount: 4,
  subProcessorCount: 2,
  vendorsByCategory: { cloud: 2, software_as_a_service: 2 },
  subProcessorNames: ['Sub A', 'Sub B'],
  infraVendorNames: ['Cloud A'],
  memberCount: 10,
  membersByDepartment: { it: 6, hr: 4 },
  deviceCount: 8,
  riskCount: 3,
  highRiskCount: 1,
  hasTrainingProgram: true,
  wizardAnswers: {},
};

describe('deriveInterestedParties', () => {
  it('produces a lean derived set with provenance', () => {
    const rows = deriveInterestedParties(data);
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(rows.length).toBeLessThanOrEqual(8);
    expect(rows.every((r) => r.source === 'derived')).toBe(true);
    expect(rows.every((r) => r.derivedFrom.length > 0)).toBe(true);
    expect(rows.every((r) => r.needsExpectations.length > 0)).toBe(true);
  });

  it('emits one regulator party per active framework', () => {
    const rows = deriveInterestedParties(data);
    const frameworkRows = rows.filter((r) =>
      r.derivedFrom.startsWith('framework:'),
    );
    expect(frameworkRows.map((r) => r.derivedFrom)).toEqual([
      'framework:ISO 27001',
      'framework:GDPR',
    ]);
  });

  it('includes members, customers, vendors and sub-processors', () => {
    const provenance = deriveInterestedParties(data).map((r) => r.derivedFrom);
    expect(provenance).toEqual(
      expect.arrayContaining([
        'members',
        'customers',
        'vendors',
        'subprocessors',
      ]),
    );
  });

  it('assigns sequential positions and is deterministic', () => {
    const rows = deriveInterestedParties(data);
    rows.forEach((row, index) => expect(row.position).toBe(index));
    expect(deriveInterestedParties(data)).toEqual(rows);
  });

  it('omits sub-processor row when none exist', () => {
    const rows = deriveInterestedParties({ ...data, subProcessorCount: 0 });
    expect(rows.some((r) => r.derivedFrom === 'subprocessors')).toBe(false);
  });
});

describe('deriveInterestedParties — wizard answers (CS-438)', () => {
  it('adds an insurer party when insurance.has', () => {
    const rows = deriveInterestedParties({
      ...data,
      wizardAnswers: { insurance: { has: true, insurerName: 'Acme Cyber' } },
    });
    const insurer = rows.find((r) => r.derivedFrom === 'wizard:insurance');
    expect(insurer).toBeDefined();
    expect(insurer?.name).toContain('Acme Cyber');
    expect(insurer?.category).toBe('Insurer');
  });

  it('omits insurer party when insurance.has is false', () => {
    const rows = deriveInterestedParties({
      ...data,
      wizardAnswers: { insurance: { has: false, insurerName: '' } },
    });
    expect(rows.some((r) => r.derivedFrom === 'wizard:insurance')).toBe(false);
  });

  it('does NOT add sector regulators as parties (they are 4.2c requirement rows only)', () => {
    const rows = deriveInterestedParties({
      ...data,
      wizardAnswers: { sectorRegulators: ['FINMA', 'custom:My Regulator'] },
    });
    // Sector regulators are surfaced once, as requirement rows in 4.2c, never as
    // duplicate parties here.
    expect(rows.some((r) => r.derivedFrom === 'wizard:regulator')).toBe(false);
  });

  it('adds a Contractors workforce party when hasContractors', () => {
    const rows = deriveInterestedParties({
      ...data,
      wizardAnswers: { hasContractors: true },
    });
    const contractors = rows.find(
      (r) => r.derivedFrom === 'wizard:contractors',
    );
    expect(contractors?.name).toBe('Contractors');
    expect(contractors?.category).toBe('Workforce');
  });

  it('adds an EU-representative party only when status is appointed', () => {
    const appointed = deriveInterestedParties({
      ...data,
      wizardAnswers: { euRep: { status: 'appointed', name: 'EU Rep Ltd' } },
    });
    expect(
      appointed.find((r) => r.derivedFrom === 'wizard:eu_rep')?.name,
    ).toContain('EU Rep Ltd');

    const pending = deriveInterestedParties({
      ...data,
      wizardAnswers: { euRep: { status: 'pending', name: '' } },
    });
    expect(pending.some((r) => r.derivedFrom === 'wizard:eu_rep')).toBe(false);
  });
});

describe('buildInterestedPartiesSections', () => {
  it('renders a table of parties', () => {
    const input: DocumentExportInput = {
      contextIssues: [],
      interestedParties: [
        { name: 'Customers', category: 'Customer', needsExpectations: 'n' },
      ],
      requirements: [],
      objectives: [],
      narrative: null,
    };
    const sections = buildInterestedPartiesSections(input);
    expect(sections).toHaveLength(1);
    expect(sections[0].table?.rows).toEqual([['Customers', 'Customer', 'n']]);
  });
});
