import type { IsmsPlatformData } from './types';
import {
  buildRiskMethodologySections,
  defaultRiskMethodologyNarrative,
  deriveRiskMethodologyNarrative,
  riskMethodologyNarrativeSchema,
} from './risk-methodology';

const data: IsmsPlatformData = {
  organizationName: 'Acme Corp',
  frameworkNames: ['ISO 27001'],
  vendorCount: 0,
  subProcessorCount: 0,
  vendorsByCategory: {},
  subProcessorNames: [],
  infraVendorNames: [],
  memberCount: 3,
  membersByDepartment: {},
  deviceCount: 0,
  riskCount: 0,
  highRiskCount: 0,
  hasTrainingProgram: false,
  wizardAnswers: {},
  partiesFingerprint: '',
  riskTreatmentFingerprint: '',
};

describe('deriveRiskMethodologyNarrative', () => {
  it('produces a schema-valid, org-name-aware default narrative', () => {
    const narrative = deriveRiskMethodologyNarrative(data);

    expect(riskMethodologyNarrativeSchema.safeParse(narrative).success).toBe(
      true,
    );
    expect(narrative.purpose).toContain('Acme Corp');
    expect(narrative.approach).toContain('Acme Corp');
    expect(narrative.likelihoodDescriptions).toHaveLength(5);
    expect(narrative.impactDescriptions).toHaveLength(5);
    expect(narrative.acceptanceThresholds).toHaveLength(5);
    expect(narrative.treatmentOptions).toHaveLength(4);
  });

  it('matches the seed-heal default used by ensure-setup', () => {
    expect(deriveRiskMethodologyNarrative(data)).toEqual(
      defaultRiskMethodologyNarrative('Acme Corp'),
    );
  });
});

describe('buildRiskMethodologySections', () => {
  const input = {
    contextIssues: [],
    interestedParties: [],
    requirements: [],
    objectives: [],
    narrative: defaultRiskMethodologyNarrative('Acme Corp'),
  };

  it('renders the twelve reference-document sections in order', () => {
    const sections = buildRiskMethodologySections(input);

    expect(sections.map((section) => section.heading)).toEqual([
      'Purpose',
      'Scope',
      'Risk assessment approach',
      'Likelihood scale',
      'Impact scale',
      'Risk level matrix',
      'Acceptance thresholds',
      'Treatment options',
      'Risk-owner responsibilities',
      'Frequency of assessment',
      'Documentation approach',
      'Sign-off',
    ]);
  });

  it('renders the 5x5 matrix with the platform banding and aligned cell fills', () => {
    const sections = buildRiskMethodologySections(input);
    const matrix = sections.find(
      (section) => section.heading === 'Risk level matrix',
    );

    expect(matrix?.table?.headers).toEqual([
      '',
      'Impact 1',
      'Impact 2',
      'Impact 3',
      'Impact 4',
      'Impact 5',
    ]);
    expect(matrix?.table?.rows).toHaveLength(5);
    // Rows run likelihood 5 -> 1 (reference-document orientation).
    expect(matrix?.table?.rows?.[0]?.[0]).toBe('Likelihood 5');
    expect(matrix?.table?.rows?.[0]?.[5]).toBe('Very high'); // 5x5 = 25
    expect(matrix?.table?.rows?.[4]?.[1]).toBe('Very low'); // 1x1 = 1
    expect(matrix?.table?.rows?.[2]?.[3]).toBe('Medium'); // 3x3 = 9
    // cellFills align with rows; the label column carries no fill.
    expect(matrix?.table?.cellFills).toHaveLength(5);
    expect(matrix?.table?.cellFills?.[0]?.[0]).toBeNull();
    expect(matrix?.table?.cellFills?.[0]?.[5]).toMatch(/^[0-9A-F]{6}$/);
  });

  it('pairs the fixed level labels with the editable threshold text', () => {
    const sections = buildRiskMethodologySections(input);
    const thresholds = sections.find(
      (section) => section.heading === 'Acceptance thresholds',
    );

    expect(thresholds?.table?.rows?.map((row) => row[0])).toEqual([
      'Very low',
      'Low',
      'Medium',
      'High',
      'Very high',
    ]);
  });

  it('falls back to emptyText when the narrative is missing or invalid', () => {
    const sections = buildRiskMethodologySections({
      ...input,
      narrative: null,
    });

    expect(sections).toHaveLength(1);
    expect(sections[0].emptyText).toBe('No methodology content saved.');
  });
});
