import type {
  RiskTreatmentExportRow,
  VendorTreatmentExportRow,
} from './types';
import {
  buildRiskTreatmentPlanSections,
  riskTreatmentValidationMessages,
} from './risk-treatment-plan';

const riskRow = (
  overrides: Partial<RiskTreatmentExportRow> = {},
): RiskTreatmentExportRow => ({
  reference: 'R-01',
  title: 'Unauthorized data sharing',
  category: 'Governance',
  inherentLevel: 'Medium',
  treatment: 'Mitigate',
  controls: 'DLP settings; awareness training.',
  ownerName: 'Jane Doe',
  residualLevel: 'Low',
  acceptance: 'Accepted 2026-04-15 (Jane Doe)',
  acceptanceState: 'accepted',
  status: 'Open',
  ...overrides,
});

const vendorRow = (
  overrides: Partial<VendorTreatmentExportRow> = {},
): VendorTreatmentExportRow => ({
  name: 'AWS',
  category: 'Cloud',
  inherentLevel: 'High',
  treatment: 'Mitigate',
  controls: 'Shared-responsibility model; DPA in place.',
  ownerName: 'John Smith',
  residualLevel: 'Medium',
  acceptance: 'Accepted 2026-04-15 (John Smith)',
  acceptanceState: 'accepted',
  status: 'Assessed',
  ...overrides,
});

describe('riskTreatmentValidationMessages', () => {
  it('is empty when every risk and vendor has an owner', () => {
    expect(
      riskTreatmentValidationMessages({
        riskCount: 3,
        risksWithoutOwner: 0,
        vendorsWithoutOwner: 0,
      }),
    ).toEqual([]);
  });

  it('requires at least one risk in the register', () => {
    expect(
      riskTreatmentValidationMessages({
        riskCount: 0,
        risksWithoutOwner: 0,
        vendorsWithoutOwner: 0,
      }),
    ).toEqual(['Record at least one risk in the Risk Register.']);
  });

  it('pluralizes owner requirements correctly', () => {
    expect(
      riskTreatmentValidationMessages({
        riskCount: 5,
        risksWithoutOwner: 1,
        vendorsWithoutOwner: 2,
      }),
    ).toEqual([
      '1 risk in the Risk Register needs an owner assigned.',
      '2 vendors need an owner assigned.',
    ]);
  });
});

describe('buildRiskTreatmentPlanSections', () => {
  const input = {
    contextIssues: [],
    interestedParties: [],
    requirements: [],
    objectives: [],
    narrative: null,
    riskTreatment: {
      risks: [
        riskRow(),
        riskRow({
          reference: 'R-02',
          title: 'EU privacy compliance',
          acceptance: 'Stale — accepted 2026-04-15 (Jane Doe); residual has changed since',
          acceptanceState: 'stale',
          residualLevel: 'Medium',
        }),
      ],
      vendors: [
        vendorRow(),
        vendorRow({
          name: 'Google Workspace',
          acceptance: 'Awaiting acceptance',
          acceptanceState: 'awaiting',
        }),
      ],
    },
  };

  it('renders the six reference-document sections in order', () => {
    const sections = buildRiskTreatmentPlanSections(input);

    expect(sections.map((section) => section.heading)).toEqual([
      'Purpose',
      'Reference',
      'Organisational risks',
      'Supplier risks',
      'Outstanding acceptances',
      'Sign-off',
    ]);
  });

  it('renders one 10-column row per risk with acceptance and status cells', () => {
    const sections = buildRiskTreatmentPlanSections(input);
    const risks = sections.find(
      (section) => section.heading === 'Organisational risks',
    );

    expect(risks?.table?.headers).toEqual([
      'Ref',
      'Description',
      'Cat.',
      'Inh',
      'Treat.',
      'Controls / actions',
      'Owner',
      'Res',
      'Acceptance',
      'Status',
    ]);
    expect(risks?.table?.rows).toHaveLength(2);
    expect(risks?.table?.rows?.[0]).toEqual([
      'R-01',
      'Unauthorized data sharing',
      'Governance',
      'Medium',
      'Mitigate',
      'DLP settings; awareness training.',
      'Jane Doe',
      'Low',
      'Accepted 2026-04-15 (Jane Doe)',
      'Open',
    ]);
    expect(risks?.intro).toContain('2 organisational risks are recorded');
  });

  it('renders per-row Status in the supplier table too', () => {
    const sections = buildRiskTreatmentPlanSections(input);
    const suppliers = sections.find(
      (section) => section.heading === 'Supplier risks',
    );

    expect(suppliers?.table?.headers?.slice(-1)).toEqual(['Status']);
    expect(suppliers?.table?.rows?.[0]?.slice(-1)).toEqual(['Assessed']);
  });

  it('lists awaiting and stale rows under Outstanding acceptances', () => {
    const sections = buildRiskTreatmentPlanSections(input);
    const outstanding = sections.find(
      (section) => section.heading === 'Outstanding acceptances',
    );

    expect(outstanding?.bullets).toHaveLength(2);
    expect(outstanding?.bullets?.[0]).toContain('R-02');
    expect(outstanding?.bullets?.[0]).toContain('stale');
    expect(outstanding?.bullets?.[1]).toContain('Google Workspace');
    expect(outstanding?.bullets?.[1]).toContain('not yet recorded');
  });

  it('reports a clean state when every acceptance is current', () => {
    const sections = buildRiskTreatmentPlanSections({
      ...input,
      riskTreatment: { risks: [riskRow()], vendors: [vendorRow()] },
    });
    const outstanding = sections.find(
      (section) => section.heading === 'Outstanding acceptances',
    );

    expect(outstanding?.bullets).toBeUndefined();
    expect(outstanding?.paragraphs?.[0]?.text).toContain('None');
  });

  it('renders emptyText tables when nothing is recorded yet', () => {
    const sections = buildRiskTreatmentPlanSections({
      ...input,
      riskTreatment: { risks: [], vendors: [] },
    });
    const risks = sections.find(
      (section) => section.heading === 'Organisational risks',
    );
    const vendors = sections.find(
      (section) => section.heading === 'Supplier risks',
    );

    expect(risks?.table?.rows).toHaveLength(0);
    expect(risks?.emptyText).toBe('No risks recorded in the Risk Register.');
    expect(vendors?.emptyText).toBe('No vendors recorded in the Vendors module.');
  });
});
