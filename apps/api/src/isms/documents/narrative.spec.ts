import {
  buildScopeSections,
  deriveScopeNarrative,
  ismsScopeNarrativeSchema,
} from './scope';
import {
  buildLeadershipSections,
  deriveLeadershipNarrative,
  leadershipNarrativeSchema,
} from './leadership';
import type { DocumentExportInput, IsmsPlatformData } from './types';

const data: IsmsPlatformData = {
  organizationName: 'Acme Inc',
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
};

const emptyInput = (narrative: unknown): DocumentExportInput => ({
  contextIssues: [],
  interestedParties: [],
  requirements: [],
  objectives: [],
  narrative,
});

describe('scope narrative (4.3)', () => {
  it('derives a schema-valid narrative referencing org + frameworks', () => {
    const narrative = deriveScopeNarrative(data);
    expect(ismsScopeNarrativeSchema.safeParse(narrative).success).toBe(true);
    expect(narrative.certificateScopeSentence).toContain('Acme Inc');
    expect(narrative.certificateScopeSentence).toContain('ISO 27001');
    expect(narrative.dependencies).toEqual(
      expect.arrayContaining([
        'Cloud A (cloud / infrastructure provider).',
        'Sub A (sub-processor).',
      ]),
    );
  });

  it('renders scope sections from a saved narrative', () => {
    const sections = buildScopeSections(emptyInput(deriveScopeNarrative(data)));
    const headings = sections.map((s) => s.heading);
    expect(headings).toEqual(
      expect.arrayContaining([
        'Scope statement',
        'Interfaces',
        'Dependencies',
        'Exclusions',
      ]),
    );
  });

  it('renders a placeholder when narrative is invalid', () => {
    const sections = buildScopeSections(emptyInput({ bogus: true }));
    expect(sections[0].emptyText).toBeDefined();
  });

  it('collapses stray whitespace so the scope sentence has no double spaces (CS-437)', () => {
    const narrative = deriveScopeNarrative({
      ...data,
      organizationName: 'Comp AI ',
    });
    expect(narrative.certificateScopeSentence).not.toMatch(/ {2,}/);
    expect(narrative.certificateScopeSentence).toContain('of Comp AI covers');
  });

  it('normalizes a wizard-confirmed sentence that contains double spaces (CS-437)', () => {
    const narrative = deriveScopeNarrative({
      ...data,
      wizardAnswers: {
        certificateScopeSentence: 'The ISMS  covers  everything.',
      },
    });
    expect(narrative.certificateScopeSentence).toBe(
      'The ISMS covers everything.',
    );
  });

  it('uses the wizard certificate scope sentence when set (CS-438)', () => {
    const narrative = deriveScopeNarrative({
      ...data,
      wizardAnswers: {
        certificateScopeSentence: 'A bespoke, customer-confirmed scope.',
      },
    });
    expect(narrative.certificateScopeSentence).toBe(
      'A bespoke, customer-confirmed scope.',
    );
  });

  it('threads cloudScopeSplit into interfaces/dependencies and capabilities into in-scope', () => {
    const narrative = deriveScopeNarrative({
      ...data,
      wizardAnswers: {
        capabilitiesInProduction: ['Payments API', 'Reporting'],
        cloudScopeSplit: {
          customer: ['Data', 'Databases'],
          provider: ['Underlying infrastructure'],
        },
      },
    });
    expect(narrative.inScope).toContain('Payments API');
    expect(narrative.interfaces).toEqual(
      expect.arrayContaining([
        'Underlying infrastructure — managed by the cloud provider.',
      ]),
    );
    expect(narrative.dependencies).toEqual(
      expect.arrayContaining([
        'Data — managed by the organization.',
        'Databases — managed by the organization.',
      ]),
    );
  });
});

describe('leadership narrative (5.1)', () => {
  it('derives all eight (a)-(h) commitments', () => {
    const narrative = deriveLeadershipNarrative(data);
    expect(leadershipNarrativeSchema.safeParse(narrative).success).toBe(true);
    expect(narrative.commitments.map((c) => c.key)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
    ]);
    expect(narrative.statement).toContain('Acme Inc');
  });

  it('renders leadership sections with labelled commitments', () => {
    const sections = buildLeadershipSections(
      emptyInput(deriveLeadershipNarrative(data)),
    );
    expect(sections[0].heading).toBe('Leadership and Commitment');
    expect(sections[0].paragraphs?.some((p) => p.label === '(a) ')).toBe(true);
  });

  it('references the Deputy SPO when appointed (CS-438)', () => {
    const narrative = deriveLeadershipNarrative({
      ...data,
      wizardAnswers: { deputySpo: { memberId: 'mem_1', toBeNamed: false } },
    });
    const deputy = narrative.commitments.find((c) => c.key === 'i');
    expect(deputy?.text).toContain('Deputy Security & Privacy Officer');
  });

  it('references the intent to name a Deputy SPO when toBeNamed', () => {
    const narrative = deriveLeadershipNarrative({
      ...data,
      wizardAnswers: { deputySpo: { memberId: null, toBeNamed: true } },
    });
    const deputy = narrative.commitments.find((c) => c.key === 'i');
    expect(deputy?.text).toContain('appoint a Deputy Security & Privacy Officer');
  });

  it('omits the Deputy SPO commitment when not provided', () => {
    const narrative = deriveLeadershipNarrative(data);
    expect(narrative.commitments.some((c) => c.key === 'i')).toBe(false);
  });
});
