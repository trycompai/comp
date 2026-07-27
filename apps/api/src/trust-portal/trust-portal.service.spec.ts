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

  // Runs a set of verified certifications through the badge-sync path and
  // returns the resulting badge types (empty when nothing maps).
  const badgeTypesFor = async (
    certifications: Array<{ type: string; status: string }>,
  ): Promise<string[]> => {
    const baseVendor = {
      id: 'vnd_1',
      name: 'Acme',
      description: null,
      website: 'acme.com',
      showOnTrustPortal: true,
      logoUrl: 'https://logo.example/acme.png',
      complianceBadges: null,
      trustPortalOrder: 0,
    };

    mockDb.vendor.findMany.mockResolvedValue([baseVendor]);
    mockDb.globalVendors.findUnique.mockResolvedValue({
      riskAssessmentData: { certifications },
    });
    mockDb.vendor.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...baseVendor,
        ...data,
      }),
    );

    const result = await service.getAllVendorsWithSync('org_1');
    const badges =
      (result[0].complianceBadges as unknown as Array<{ type: string }>) ?? [];
    return badges.map((badge) => badge.type);
  };

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

  it('maps "ISO 9001:2015" to the iso9001 badge', async () => {
    const badgeTypes = await badgeTypesFor([
      { type: 'ISO 9001:2015', status: 'verified' },
    ]);

    expect(badgeTypes).toContain('iso9001');
  });

  // The "IEC" infix must be tolerated for every joint ISO/IEC standard, not
  // just 27001 — otherwise ISO/IEC 42001 certifications are silently dropped.
  it('maps "ISO/IEC 42001:2023" to the iso42001 badge', async () => {
    const badgeTypes = await badgeTypesFor([
      { type: 'ISO/IEC 42001:2023', status: 'verified' },
    ]);

    expect(badgeTypes).toContain('iso42001');
  });

  // Regression: a bare substring match on the digits ("9001") misclassified
  // unrelated identifiers that merely contain them (e.g. a catalog id "19001")
  // as ISO 9001, surfacing a certification the vendor never held. The match now
  // requires the "ISO" prefix, so the digits alone are not enough.
  it('does not misclassify an unrelated id containing "9001" as iso9001', async () => {
    const badgeTypes = await badgeTypesFor([
      { type: 'Catalog 19001', status: 'verified' },
      { type: 'GDPR Compliance', status: 'verified' },
    ]);

    expect(badgeTypes).not.toContain('iso9001');
    // Sanity check that the sync path still ran and produced real badges.
    expect(badgeTypes).toContain('gdpr');
  });

  // Regression: the ISO number must not match as a prefix of a longer number.
  // "ISO 90010" normalizes to "iso90010" and would otherwise match iso9001;
  // only an optional 4-digit year (e.g. ":2015") may follow the standard number.
  it('does not read "ISO 90010" as the iso9001 badge', async () => {
    const badgeTypes = await badgeTypesFor([
      { type: 'ISO 90010', status: 'verified' },
      { type: 'GDPR Compliance', status: 'verified' },
    ]);

    expect(badgeTypes).not.toContain('iso9001');
    expect(badgeTypes).toContain('gdpr');
  });

  // Real-world boundary: ISO/IEC 27017 (cloud security) shares the "2701"
  // prefix with 27001 but is a distinct standard and must not earn its badge.
  it('does not read "ISO/IEC 27017:2015" as the iso27001 badge', async () => {
    const badgeTypes = await badgeTypesFor([
      { type: 'ISO/IEC 27017:2015', status: 'verified' },
    ]);

    expect(badgeTypes).not.toContain('iso27001');
  });

  // ISO/IEC 27018 (PII in the cloud) is another distinct 2701x standard.
  it('does not read "ISO/IEC 27018:2019" as the iso27001 badge', async () => {
    const badgeTypes = await badgeTypesFor([
      { type: 'ISO/IEC 27018:2019', status: 'verified' },
    ]);

    expect(badgeTypes).not.toContain('iso27001');
  });

  // Guardrail: a realistic mix of certification names (all carrying the "ISO"
  // prefix, as produced by the extraction schema) must still map to every badge
  // — the precision tightening must not drop any legitimate certification.
  it('maps a realistic mix of certifications without dropping any', async () => {
    const badgeTypes = await badgeTypesFor([
      { type: 'SOC 2 Type II', status: 'verified' },
      { type: 'ISO/IEC 27001:2013', status: 'verified' },
      { type: 'ISO 9001', status: 'verified' },
      { type: 'ISO/IEC 42001:2023', status: 'verified' },
      { type: 'GDPR Compliance', status: 'verified' },
    ]);

    expect(badgeTypes).toEqual(
      expect.arrayContaining(['soc2', 'iso27001', 'iso9001', 'iso42001', 'gdpr']),
    );
  });
});
