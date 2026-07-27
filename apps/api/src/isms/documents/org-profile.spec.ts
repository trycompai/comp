// Mock @db before importing the unit under test so loadOrgProfile reads from
// these fakes. We only stub the table methods the function actually calls.
const mockDb = {
  organization: { findUnique: jest.fn() },
  context: { findMany: jest.fn() },
  ismsProfile: { findUnique: jest.fn() },
};

jest.mock('@db', () => ({ db: mockDb }));

import { loadOrgProfile } from './org-profile';
import { DEFAULT_INTENDED_OUTCOMES } from '../wizard/wizard-defaults';

const ARGS = { organizationId: 'org_1', frameworkId: 'fw_1' };

function seedDb({ answers }: { answers: unknown }) {
  mockDb.organization.findUnique.mockResolvedValue({
    name: 'Acme',
    website: 'https://acme.test',
  });
  mockDb.context.findMany.mockResolvedValue([]);
  mockDb.ismsProfile.findUnique.mockResolvedValue({ answers });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('loadOrgProfile intendedOutcomes', () => {
  it('falls back to the default outcomes when intended outcomes were never set', async () => {
    seedDb({ answers: {} });

    const profile = await loadOrgProfile(ARGS);

    expect(profile.intendedOutcomes).toEqual(DEFAULT_INTENDED_OUTCOMES);
  });

  it('falls back to the default outcomes when there is no saved profile', async () => {
    mockDb.organization.findUnique.mockResolvedValue({ name: 'Acme', website: null });
    mockDb.context.findMany.mockResolvedValue([]);
    mockDb.ismsProfile.findUnique.mockResolvedValue(null);

    const profile = await loadOrgProfile(ARGS);

    expect(profile.intendedOutcomes).toEqual(DEFAULT_INTENDED_OUTCOMES);
  });

  it('respects an explicitly-saved empty intended-outcomes array (CS-438)', async () => {
    seedDb({ answers: { intendedOutcomes: [] } });

    const profile = await loadOrgProfile(ARGS);

    expect(profile.intendedOutcomes).toEqual([]);
  });

  it('uses saved intended outcomes when provided, overriding defaults', async () => {
    seedDb({
      answers: { intendedOutcomes: ['Protect customer data', 'Stay certified'] },
    });

    const profile = await loadOrgProfile(ARGS);

    expect(profile.intendedOutcomes).toEqual([
      'Protect customer data',
      'Stay certified',
    ]);
  });
});
