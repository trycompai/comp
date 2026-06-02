import { buildRequirementsSections, deriveRequirements } from './requirements';
import type { DocumentExportInput, IsmsPlatformData } from './types';

const data: IsmsPlatformData = {
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
  highRiskCount: 0,
  hasTrainingProgram: true,
  wizardAnswers: {},
  partiesFingerprint: '',
};

describe('deriveRequirements', () => {
  it('derives one requirement per supplied party and links the party id', () => {
    const parties = [
      { id: 'ip_1', name: 'Customers', category: 'Customer' },
      {
        id: 'ip_2',
        name: 'Regulator',
        category: 'Regulator / Certification body',
      },
    ];
    const rows = deriveRequirements({ parties, data });
    expect(rows).toHaveLength(2);
    expect(rows[0].interestedPartyId).toBe('ip_1');
    expect(rows[0].derivedFrom).toBe('party:ip_1');
    expect(rows.every((r) => r.source === 'derived')).toBe(true);
    expect(rows.every((r) => r.requirement.length > 0)).toBe(true);
    expect(rows.every((r) => r.treatment.length > 0)).toBe(true);
  });

  it('falls back to a platform-derived default set when no parties exist', () => {
    const rows = deriveRequirements({ parties: [], data });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.interestedPartyId === null)).toBe(true);
    expect(rows[0].derivedFrom.startsWith('party:')).toBe(true);
  });

  it('assigns sequential positions', () => {
    const rows = deriveRequirements({ parties: [], data });
    rows.forEach((row, index) => expect(row.position).toBe(index));
  });

  it('appends one requirement row per wizard sector regulator (CS-438)', () => {
    const parties = [{ id: 'ip_1', name: 'Customers', category: 'Customer' }];
    const rows = deriveRequirements({
      parties,
      data: {
        ...data,
        wizardAnswers: { sectorRegulators: ['FCA', 'custom:Local Authority'] },
      },
    });
    const regulatorRows = rows.filter((r) => r.derivedFrom === 'wizard:regulator');
    expect(regulatorRows).toHaveLength(2);
    expect(regulatorRows.map((r) => r.partyName)).toEqual([
      'Regulator (FCA)',
      'Regulator (Local Authority)',
    ]);
    // Wizard rows come after the party rows and keep sequential positions.
    expect(regulatorRows[0].position).toBe(parties.length);
    expect(regulatorRows.every((r) => r.interestedPartyId === null)).toBe(true);
  });
});

describe('buildRequirementsSections', () => {
  it('renders a requirements/treatment table', () => {
    const input: DocumentExportInput = {
      contextIssues: [],
      interestedParties: [],
      requirements: [
        { partyName: 'Customers', requirement: 'r', treatment: 't' },
      ],
      objectives: [],
      narrative: null,
    };
    const sections = buildRequirementsSections(input);
    expect(sections[0].table?.rows).toEqual([['Customers', 'r', 't']]);
  });
});
