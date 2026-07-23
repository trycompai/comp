const mockDb = {
  risk: { findMany: jest.fn() },
  vendor: { findMany: jest.fn() },
  riskAcceptance: { findMany: jest.fn() },
};

jest.mock('@db', () => ({ db: mockDb }));

import { loadRiskTreatmentExtras } from './risk-treatment-export-data';

const ORG = 'org_1';

const baseRisk = {
  id: 'rsk_1',
  title: 'Cloud misconfiguration',
  category: 'technology',
  status: 'open',
  likelihood: 'possible',
  impact: 'major',
  residualLikelihood: 'unlikely',
  residualImpact: 'minor',
  treatmentStrategy: 'mitigate',
  treatmentStrategyDescription: 'IaC review; drift detection.',
  assignee: { user: { name: 'Jane Doe', email: 'jane@acme.com' } },
};

const baseVendor = {
  id: 'vnd_1',
  name: 'AWS',
  category: 'cloud',
  status: 'assessed',
  inherentProbability: 'likely',
  inherentImpact: 'major',
  residualProbability: 'possible',
  residualImpact: 'moderate',
  treatmentStrategy: 'mitigate',
  treatmentStrategyDescription: 'Shared-responsibility model.',
  assignee: null,
};

function seed({
  risks = [baseRisk],
  vendors = [baseVendor],
  acceptances = [] as Array<Record<string, unknown>>,
} = {}) {
  mockDb.risk.findMany.mockResolvedValue(risks);
  mockDb.vendor.findMany.mockResolvedValue(vendors);
  mockDb.riskAcceptance.findMany.mockResolvedValue(acceptances);
}

describe('loadRiskTreatmentExtras', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves levels, humanized labels, references, and owner names', async () => {
    seed();

    const extras = await loadRiskTreatmentExtras({ organizationId: ORG });

    expect(extras.risks).toHaveLength(1);
    expect(extras.risks[0]).toMatchObject({
      reference: 'R-01',
      title: 'Cloud misconfiguration',
      category: 'Technology',
      inherentLevel: 'High', // possible(3) x major(4) = 12
      treatment: 'Mitigate',
      controls: 'IaC review; drift detection.',
      ownerName: 'Jane Doe',
      residualLevel: 'Low', // unlikely(2) x minor(2) = 4
      acceptance: 'Awaiting acceptance',
      acceptanceState: 'awaiting',
      status: 'Open',
    });
    expect(extras.vendors[0]).toMatchObject({
      name: 'AWS',
      inherentLevel: 'High', // likely(4) x major(4) = 16
      residualLevel: 'Medium', // possible(3) x moderate(3) = 9
      ownerName: '—',
      status: 'Assessed',
    });
  });

  it('excludes archived risks from the plan', async () => {
    seed();
    await loadRiskTreatmentExtras({ organizationId: ORG });

    expect(mockDb.risk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG, status: { not: 'archived' } },
      }),
    );
  });

  it('marks the latest acceptance stale when the residual rating moved', async () => {
    seed({
      acceptances: [
        {
          riskId: 'rsk_1',
          vendorId: null,
          acceptedByName: 'Jane Doe',
          // Frozen at a different rating than the risk's current residual.
          residualLikelihood: 'possible',
          residualImpact: 'moderate',
          createdAt: new Date('2026-04-15T00:00:00Z'),
        },
      ],
    });

    const extras = await loadRiskTreatmentExtras({ organizationId: ORG });

    expect(extras.risks[0].acceptanceState).toBe('stale');
    expect(extras.risks[0].acceptance).toContain('Stale');
    expect(extras.risks[0].acceptance).toContain('2026-04-15');
  });

  it('uses the newest acceptance per subject (rows arrive newest first)', async () => {
    seed({
      acceptances: [
        {
          riskId: 'rsk_1',
          vendorId: null,
          acceptedByName: 'Jane Doe',
          residualLikelihood: 'unlikely',
          residualImpact: 'minor',
          createdAt: new Date('2026-05-01T00:00:00Z'),
        },
        {
          riskId: 'rsk_1',
          vendorId: null,
          acceptedByName: 'Old Owner',
          residualLikelihood: 'possible',
          residualImpact: 'moderate',
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
    });

    const extras = await loadRiskTreatmentExtras({ organizationId: ORG });

    expect(extras.risks[0].acceptanceState).toBe('accepted');
    expect(extras.risks[0].acceptance).toBe('Accepted 2026-05-01 (Jane Doe)');
  });

  it('resolves vendor acceptances against the vendor residual fields', async () => {
    seed({
      acceptances: [
        {
          riskId: null,
          vendorId: 'vnd_1',
          acceptedByName: 'John Smith',
          residualLikelihood: 'possible',
          residualImpact: 'moderate',
          createdAt: new Date('2026-04-15T00:00:00Z'),
        },
      ],
    });

    const extras = await loadRiskTreatmentExtras({ organizationId: ORG });

    expect(extras.vendors[0].acceptanceState).toBe('accepted');
  });

  it('renders a dash when no treatment description is recorded', async () => {
    seed({
      risks: [{ ...baseRisk, treatmentStrategyDescription: '  ' }],
    });

    const extras = await loadRiskTreatmentExtras({ organizationId: ORG });

    expect(extras.risks[0].controls).toBe('—');
  });
});
