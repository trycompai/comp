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
});
