import { buildContextSections } from './context';
import type { DocumentExportInput } from './types';

const input: DocumentExportInput = {
  contextIssues: [
    // Deliberately out of category order to prove the section sorts them.
    {
      kind: 'external',
      category: 'Technological',
      description: 'Reliance on cloud vendors',
      effect: 'Extends the ISMS boundary',
    },
    {
      kind: 'external',
      category: 'Regulatory & Legal',
      description: 'ISO 27001 obligations',
      effect: 'Shapes ISMS objectives and audit scope',
    },
    {
      kind: 'internal',
      category: 'Capabilities & Resources',
      description: 'Managed endpoints',
      effect: 'Drives device-management controls',
    },
    {
      kind: 'internal',
      category: 'Governance & Structure',
      description: 'A workforce of 12 members',
      effect: 'Determines awareness and access needs',
    },
  ],
  interestedParties: [],
  requirements: [],
  objectives: [],
  narrative: null,
  orgProfile: {
    overview: [
      { label: 'Legal entity', value: 'Acme Inc' },
      { label: 'Website', value: 'https://acme.io' },
      { label: 'Industry', value: 'SaaS' },
    ],
    mission: 'We build secure compliance tooling.',
    intendedOutcomes: [
      'Protect the confidentiality, integrity and availability of information.',
      'Meet legal and contractual obligations.',
    ],
  },
};

describe('buildContextSections', () => {
  it('returns the full 7-section structure with numbered headings', () => {
    const sections = buildContextSections(input);
    expect(sections.map((s) => s.heading)).toEqual([
      '1. Purpose',
      '2. Organization overview',
      '3. Mission and intended outcomes of the ISMS',
      '4. External issues (4.1)',
      '5. Internal issues (4.1)',
      '6. Linkage to the ISMS',
      '7. Review',
    ]);
  });

  it('uses the legal entity name in the purpose narrative', () => {
    const sections = buildContextSections(input);
    expect(sections[0].paragraphs?.[0].text).toContain('Acme Inc');
  });

  it('renders the organization overview as key/value rows', () => {
    const overview = buildContextSections(input)[1];
    expect(overview.keyValues).toEqual(input.orgProfile?.overview);
  });

  it('renders the mission and intended-outcome bullets in section 3', () => {
    const mission = buildContextSections(input)[2];
    expect(mission.paragraphs?.some((p) => p.text === '3.1 Mission')).toBe(true);
    expect(
      mission.paragraphs?.some(
        (p) => p.text === 'We build secure compliance tooling.',
      ),
    ).toBe(true);
    expect(mission.bullets).toEqual(input.orgProfile?.intendedOutcomes);
  });

  it('builds the external issues table with the categorised headers', () => {
    const external = buildContextSections(input)[3];
    expect(external.table?.headers).toEqual([
      'Category',
      'External issue',
      'Effect on the ability to achieve ISMS objectives',
    ]);
  });

  it('sorts external issue rows by category and includes the category value', () => {
    const external = buildContextSections(input)[3];
    expect(external.table?.rows).toEqual([
      [
        'Regulatory & Legal',
        'ISO 27001 obligations',
        'Shapes ISMS objectives and audit scope',
      ],
      [
        'Technological',
        'Reliance on cloud vendors',
        'Extends the ISMS boundary',
      ],
    ]);
  });

  it('builds the internal issues table sorted by category', () => {
    const internal = buildContextSections(input)[4];
    expect(internal.table?.headers).toEqual([
      'Category',
      'Internal issue',
      'Effect on the ability to achieve ISMS objectives',
    ]);
    expect(internal.table?.rows.map((row) => row[0])).toEqual([
      'Governance & Structure',
      'Capabilities & Resources',
    ]);
  });

  it('provides linkage bullets in section 6', () => {
    const linkage = buildContextSections(input)[5];
    expect(linkage.bullets?.length).toBeGreaterThan(0);
    expect(linkage.bullets?.some((b) => b.includes('Clause 4.2'))).toBe(true);
  });

  it('falls back gracefully when no org profile is supplied', () => {
    const sections = buildContextSections({
      ...input,
      orgProfile: undefined,
    });
    expect(sections).toHaveLength(7);
    expect(sections[1].keyValues).toEqual([]);
    expect(sections[0].paragraphs?.[0].text).toContain('the organization');
  });
});
