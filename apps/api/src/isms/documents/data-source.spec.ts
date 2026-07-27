// Mock @db before importing the unit under test so collectPlatformData reads
// from these fakes. We only stub the table methods the function actually calls.
const mockDb = {
  organization: { findUnique: jest.fn() },
  frameworkInstance: { findMany: jest.fn() },
  vendor: { findMany: jest.fn() },
  member: { count: jest.fn(), groupBy: jest.fn() },
  device: { count: jest.fn() },
  risk: { findMany: jest.fn() },
  employeeTrainingVideoCompletion: { count: jest.fn() },
  frameworkEditorFramework: { findUnique: jest.fn() },
  ismsProfile: { findUnique: jest.fn() },
  ismsInterestedParty: { findMany: jest.fn() },
  riskAcceptance: { findMany: jest.fn() },
};

jest.mock('@db', () => ({ db: mockDb }));

import { collectPlatformData } from './data-source';

type VendorRow = { name: string; category: string; isSubProcessor: boolean };
type RiskRow = { residualLikelihood: string; residualImpact: string };
type PartyRow = { id: string; name: string; category: string };

const ARGS = { organizationId: 'org_1', frameworkId: 'fw_1' };

function seedDb({
  vendors = [],
  membersGrouped = [],
  risks = [],
  parties = [],
  memberCount = 0,
  deviceCount = 0,
  trainingCount = 0,
}: {
  vendors?: VendorRow[];
  membersGrouped?: Array<{ department: string; _count: { _all: number } }>;
  risks?: RiskRow[];
  parties?: PartyRow[];
  memberCount?: number;
  deviceCount?: number;
  trainingCount?: number;
}) {
  mockDb.organization.findUnique.mockResolvedValue({ name: '  Acme Corp  ' });
  mockDb.frameworkInstance.findMany.mockResolvedValue([
    { framework: { name: 'SOC 2' } },
  ]);
  mockDb.vendor.findMany.mockResolvedValue(vendors);
  mockDb.member.count.mockResolvedValue(memberCount);
  mockDb.member.groupBy.mockResolvedValue(membersGrouped);
  mockDb.device.count.mockResolvedValue(deviceCount);
  mockDb.risk.findMany.mockResolvedValue(risks);
  mockDb.employeeTrainingVideoCompletion.count.mockResolvedValue(trainingCount);
  mockDb.frameworkEditorFramework.findUnique.mockResolvedValue({
    name: 'ISO 27001',
  });
  mockDb.ismsProfile.findUnique.mockResolvedValue({ answers: {} });
  mockDb.ismsInterestedParty.findMany.mockResolvedValue(parties);
  mockDb.riskAcceptance.findMany.mockResolvedValue([]);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('collectPlatformData', () => {
  it('counts only high-likelihood AND high-impact risks as high risk', async () => {
    seedDb({
      risks: [
        { residualLikelihood: 'likely', residualImpact: 'major' }, // high+high -> counts
        { residualLikelihood: 'very_likely', residualImpact: 'severe' }, // counts
        { residualLikelihood: 'very_likely', residualImpact: 'minor' }, // high likelihood only
        { residualLikelihood: 'unlikely', residualImpact: 'severe' }, // high impact only
        { residualLikelihood: 'unlikely', residualImpact: 'minor' }, // neither
      ],
    });

    const data = await collectPlatformData(ARGS);

    expect(data.riskCount).toBe(5);
    expect(data.highRiskCount).toBe(2);
  });

  it('groups vendors by category and tracks sub-processors and infra vendors', async () => {
    seedDb({
      vendors: [
        { name: 'AWS', category: 'cloud', isSubProcessor: true },
        { name: 'GCP', category: 'infrastructure', isSubProcessor: false },
        { name: 'Stripe', category: 'software_as_a_service', isSubProcessor: true },
        { name: 'Acme HR', category: 'hr', isSubProcessor: false },
      ],
    });

    const data = await collectPlatformData(ARGS);

    expect(data.vendorCount).toBe(4);
    expect(data.vendorsByCategory).toEqual({
      cloud: 1,
      infrastructure: 1,
      software_as_a_service: 1,
      hr: 1,
    });
    // sub-processors are AWS + Stripe, returned sorted.
    expect(data.subProcessorCount).toBe(2);
    expect(data.subProcessorNames).toEqual(['AWS', 'Stripe']);
    // infra/cloud categories only (not the hr vendor), sorted.
    expect(data.infraVendorNames).toEqual(['AWS', 'GCP', 'Stripe']);
  });

  it('groups members by department from the groupBy aggregation', async () => {
    seedDb({
      memberCount: 5,
      membersGrouped: [
        { department: 'it', _count: { _all: 3 } },
        { department: 'hr', _count: { _all: 2 } },
      ],
    });

    const data = await collectPlatformData(ARGS);

    expect(data.memberCount).toBe(5);
    expect(data.membersByDepartment).toEqual({ it: 3, hr: 2 });
  });

  it('merges framework instance names with the requested framework, sorted', async () => {
    seedDb({});

    const data = await collectPlatformData(ARGS);

    // SOC 2 (instance) + ISO 27001 (ownFramework), de-duped and sorted.
    expect(data.frameworkNames).toEqual(['ISO 27001', 'SOC 2']);
  });

  it('trims the organization name and flags the training program', async () => {
    seedDb({ trainingCount: 4 });

    const data = await collectPlatformData(ARGS);

    expect(data.organizationName).toBe('Acme Corp');
    expect(data.hasTrainingProgram).toBe(true);
  });

  it('falls back to a default org name and no training when empty', async () => {
    seedDb({ trainingCount: 0 });
    mockDb.organization.findUnique.mockResolvedValue({ name: '   ' });

    const data = await collectPlatformData(ARGS);

    expect(data.organizationName).toBe('The organization');
    expect(data.hasTrainingProgram).toBe(false);
  });

  it('produces an order-insensitive parties fingerprint', async () => {
    const partiesA: PartyRow[] = [
      { id: 'p1', name: 'Customers', category: 'external' },
      { id: 'p2', name: 'Regulators', category: 'external' },
    ];
    const partiesReordered: PartyRow[] = [partiesA[1], partiesA[0]];

    seedDb({ parties: partiesA });
    const a = await collectPlatformData(ARGS);

    seedDb({ parties: partiesReordered });
    const b = await collectPlatformData(ARGS);

    expect(a.partiesFingerprint).toEqual(b.partiesFingerprint);
    expect(a.partiesFingerprint).not.toBe('');
  });

  it('changes the fingerprint when a party is edited', async () => {
    const original: PartyRow[] = [
      { id: 'p1', name: 'Customers', category: 'external' },
    ];
    const edited: PartyRow[] = [
      { id: 'p1', name: 'Customers (key accounts)', category: 'external' },
    ];

    seedDb({ parties: original });
    const before = await collectPlatformData(ARGS);

    seedDb({ parties: edited });
    const after = await collectPlatformData(ARGS);

    expect(after.partiesFingerprint).not.toBe(before.partiesFingerprint);
  });

  it('returns an empty fingerprint when no parties exist', async () => {
    seedDb({ parties: [] });

    const data = await collectPlatformData(ARGS);

    expect(data.partiesFingerprint).toBe('');
  });
});
