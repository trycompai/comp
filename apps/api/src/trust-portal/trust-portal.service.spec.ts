import { db } from '@db';
import { TrustPortalService } from './trust-portal.service';

jest.mock('@db', () => ({
  db: {
    vendor: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    globalVendors: {
      findUnique: jest.fn(),
    },
  },
  Prisma: {},
  TrustFramework: {
    iso_27001: 'iso_27001',
    iso_42001: 'iso_42001',
    gdpr: 'gdpr',
    hipaa: 'hipaa',
    soc2_type1: 'soc2_type1',
    soc2_type2: 'soc2_type2',
    pci_dss: 'pci_dss',
    nen_7510: 'nen_7510',
    iso_9001: 'iso_9001',
  },
}));

jest.mock('../app/s3', () => ({
  APP_AWS_ORG_ASSETS_BUCKET: 'org-assets',
  s3Client: { send: jest.fn() },
  getSignedUrl: jest.fn(),
}));

const mockDb = db as unknown as {
  vendor: { findMany: jest.Mock; update: jest.Mock };
  globalVendors: { findUnique: jest.Mock };
};

describe('TrustPortalService getAllVendorsWithSync compliance badges', () => {
  const service = new TrustPortalService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Regression: Scaleway's GlobalVendors record lists "ISO/IEC 27001:2022",
  // "HDS" and "GDPR Compliance" as verified, but the Trust Centre only showed
  // GDPR. The "IEC" infix and ":2022" suffix caused the ISO 27001 certification
  // to be dropped during badge sync, understating the vendor's posture.
  it('maps "ISO/IEC 27001:2022" to the iso27001 badge alongside gdpr', async () => {
    const baseVendor = {
      id: 'vnd_scaleway',
      name: 'Scaleway',
      description: null,
      website: 'scaleway.com',
      showOnTrustPortal: true,
      logoUrl: 'https://logo.example/scaleway.png',
      complianceBadges: null,
      trustPortalOrder: 0,
    };

    mockDb.vendor.findMany.mockResolvedValue([baseVendor]);
    mockDb.globalVendors.findUnique.mockResolvedValue({
      riskAssessmentData: {
        certifications: [
          { type: 'ISO/IEC 27001:2022', status: 'verified' },
          { type: 'HDS', status: 'verified' },
          { type: 'GDPR Compliance', status: 'verified' },
        ],
      },
    });
    mockDb.vendor.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...baseVendor,
        ...data,
      }),
    );

    const result = await service.getAllVendorsWithSync('org_1');

    const badgeTypes = (
      result[0].complianceBadges as unknown as Array<{ type: string }>
    ).map((badge) => badge.type);

    expect(badgeTypes).toContain('iso27001');
    expect(badgeTypes).toContain('gdpr');
  });
});
