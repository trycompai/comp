import { buildObjectivesSections, deriveObjectives } from './objectives';
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
  riskCount: 4,
  highRiskCount: 2,
  hasTrainingProgram: true,
  wizardAnswers: {},
  partiesFingerprint: '',
};

describe('deriveObjectives', () => {
  it('derives framework, training, risk and vendor objectives', () => {
    const rows = deriveObjectives(data);
    const provenance = rows.map((r) => r.derivedFrom);
    expect(provenance).toEqual(
      expect.arrayContaining([
        'framework:ISO 27001',
        'training',
        'risks',
        'vendors',
      ]),
    );
    expect(rows.every((r) => r.source === 'derived')).toBe(true);
    expect(rows.every((r) => r.objective.length > 0)).toBe(true);
  });

  it('references the high/critical risk count in the risk objective target', () => {
    const rows = deriveObjectives(data);
    const riskRow = rows.find((r) => r.derivedFrom === 'risks');
    expect(riskRow?.target).toContain('2');
  });

  it('omits the risk objective when there are no risks', () => {
    const rows = deriveObjectives({ ...data, riskCount: 0, highRiskCount: 0 });
    expect(rows.some((r) => r.derivedFrom === 'risks')).toBe(false);
  });

  it('assigns sequential positions and is deterministic', () => {
    const rows = deriveObjectives(data);
    rows.forEach((row, index) => expect(row.position).toBe(index));
    expect(deriveObjectives(data)).toEqual(rows);
  });

  it('uses wizard objectives when provided, overriding defaults (CS-438)', () => {
    const rows = deriveObjectives({
      ...data,
      wizardAnswers: {
        objectives: [
          { objective: 'Reduce phishing click rate', target: '< 3%' },
          { objective: 'Patch criticals in 7 days', target: '100%' },
        ],
      },
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.objective)).toEqual([
      'Reduce phishing click rate',
      'Patch criticals in 7 days',
    ]);
    expect(rows[0].target).toBe('< 3%');
    expect(rows.every((r) => r.derivedFrom === 'wizard:objective')).toBe(true);
    expect(rows.every((r) => r.source === 'derived')).toBe(true);
  });

  it('falls back to defaults when wizard objectives is empty', () => {
    const rows = deriveObjectives({ ...data, wizardAnswers: { objectives: [] } });
    expect(rows.some((r) => r.derivedFrom === 'wizard:objective')).toBe(false);
    expect(rows.some((r) => r.derivedFrom.startsWith('framework:'))).toBe(true);
  });
});

describe('buildObjectivesSections', () => {
  it('renders an objectives table including plan, measurement, cadence and status', () => {
    const input: DocumentExportInput = {
      contextIssues: [],
      interestedParties: [],
      requirements: [],
      objectives: [
        {
          objective: 'Maintain ISO 27001',
          target: 'Certified',
          cadence: 'Annual',
          status: 'on_track',
          plan: 'Operate controls and pass the audit',
          measurementMethod: 'Audit outcome',
        },
      ],
      narrative: null,
    };
    const sections = buildObjectivesSections(input);
    expect(sections[0].table?.headers).toEqual([
      'Objective',
      'Target',
      'Plan',
      'Measurement',
      'Cadence',
      'Status',
    ]);
    expect(sections[0].table?.rows).toEqual([
      [
        'Maintain ISO 27001',
        'Certified',
        'Operate controls and pass the audit',
        'Audit outcome',
        'Annual',
        'on_track',
      ],
    ]);
  });

  it('renders em-dashes for missing plan and measurement', () => {
    const input: DocumentExportInput = {
      contextIssues: [],
      interestedParties: [],
      requirements: [],
      objectives: [
        {
          objective: 'Reduce phishing click rate',
          target: '< 3%',
          cadence: null,
          status: 'on_track',
          plan: null,
          measurementMethod: null,
        },
      ],
      narrative: null,
    };
    const sections = buildObjectivesSections(input);
    expect(sections[0].table?.rows).toEqual([
      ['Reduce phishing click rate', '< 3%', '—', '—', '—', 'on_track'],
    ]);
  });
});
