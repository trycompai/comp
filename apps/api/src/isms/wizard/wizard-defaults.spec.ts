import { db } from '@db';
import { collectPlatformData } from '../documents/data-source';
import {
  DEFAULT_CLOUD_SCOPE_SPLIT,
  DEFAULT_INTENDED_OUTCOMES,
  computeWizardDefaults,
} from './wizard-defaults';
import { SECTOR_REGULATOR_OPTIONS } from './wizard-schema';
import type { IsmsPlatformData } from '../documents/types';

jest.mock('@db', () => ({
  db: { context: { findFirst: jest.fn() } },
}));
jest.mock('../documents/data-source', () => ({
  collectPlatformData: jest.fn(),
}));

const mockDb = jest.mocked(db);
const mockCollect = jest.mocked(collectPlatformData);

const platformData: IsmsPlatformData = {
  organizationName: 'Acme Inc',
  frameworkNames: ['ISO 27001'],
  vendorCount: 2,
  subProcessorCount: 1,
  vendorsByCategory: { cloud: 2 },
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

const args = { organizationId: 'org_1', frameworkId: 'fw_1' };

describe('computeWizardDefaults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollect.mockResolvedValue(platformData);
  });

  it('returns the certificate scope sentence from the scope derivation', async () => {
    (mockDb.context.findFirst as jest.Mock).mockResolvedValue(null);
    const result = await computeWizardDefaults(args);
    expect(result.certificateScopeSentence).toContain('Acme Inc');
    expect(result.certificateScopeSentence).toContain('ISO 27001');
  });

  it('returns the default objectives (objective + target) from the derivation', async () => {
    (mockDb.context.findFirst as jest.Mock).mockResolvedValue(null);
    const result = await computeWizardDefaults(args);
    expect(result.objectives.length).toBeGreaterThan(0);
    expect(result.objectives[0]).toHaveProperty('objective');
    expect(result.objectives[0]).toHaveProperty('target');
  });

  it('returns the static intended outcomes, cloud split and regulator options', async () => {
    (mockDb.context.findFirst as jest.Mock).mockResolvedValue(null);
    const result = await computeWizardDefaults(args);
    expect(result.intendedOutcomes).toEqual(DEFAULT_INTENDED_OUTCOMES);
    expect(result.cloudScopeSplit).toEqual(DEFAULT_CLOUD_SCOPE_SPLIT);
    expect(result.sectorRegulatorOptions).toEqual([...SECTOR_REGULATOR_OPTIONS]);
  });

  it('splits the Types of Services context answer into capabilities', async () => {
    (mockDb.context.findFirst as jest.Mock).mockResolvedValue({
      answer: '- Payments API\n- Reporting dashboard\n- Mobile app',
    });
    const result = await computeWizardDefaults(args);
    expect(result.capabilitiesInProduction).toEqual([
      'Payments API',
      'Reporting dashboard',
      'Mobile app',
    ]);
  });

  it('returns [] capabilities when no services context exists', async () => {
    (mockDb.context.findFirst as jest.Mock).mockResolvedValue(null);
    const result = await computeWizardDefaults(args);
    expect(result.capabilitiesInProduction).toEqual([]);
  });
});
