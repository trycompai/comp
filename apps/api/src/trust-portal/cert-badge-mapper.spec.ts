import {
  extractComplianceBadges,
  mapCertificationToBadgeType,
} from './cert-badge-mapper';

describe('mapCertificationToBadgeType', () => {
  // CS-688: the "IEC" infix and ":2022" suffix must not stop ISO 27001 from
  // being recognized.
  it('maps "ISO/IEC 27001:2022" to iso27001', () => {
    expect(mapCertificationToBadgeType('ISO/IEC 27001:2022')).toBe('iso27001');
  });

  it('maps common certifications to their canonical badge types', () => {
    expect(mapCertificationToBadgeType('SOC 2 Type II')).toBe('soc2');
    expect(mapCertificationToBadgeType('ISO 9001:2015')).toBe('iso9001');
    expect(mapCertificationToBadgeType('ISO/IEC 42001:2023')).toBe('iso42001');
    expect(mapCertificationToBadgeType('GDPR Compliance')).toBe('gdpr');
    expect(mapCertificationToBadgeType('HIPAA')).toBe('hipaa');
    expect(mapCertificationToBadgeType('PCI DSS')).toBe('pci_dss');
    expect(mapCertificationToBadgeType('NEN 7510')).toBe('nen7510');
  });

  // The fully spelled-out PCI name must map too — the scan-time mappers already
  // recognize it, so the shared display mapper must not drop it.
  it('maps the spelled-out "Payment Card Industry Data Security Standard"', () => {
    expect(
      mapCertificationToBadgeType('Payment Card Industry Data Security Standard'),
    ).toBe('pci_dss');
  });

  // The digits alone must not classify an unrelated identifier.
  it('does not misclassify ids that merely contain the standard digits', () => {
    expect(mapCertificationToBadgeType('Catalog 19001')).toBeNull();
    expect(mapCertificationToBadgeType('ISO 90010')).toBeNull();
  });

  // Distinct 2701x standards must not earn the 27001 badge.
  it('does not read ISO/IEC 27017 or 27018 as iso27001', () => {
    expect(mapCertificationToBadgeType('ISO/IEC 27017:2015')).toBeNull();
    expect(mapCertificationToBadgeType('ISO/IEC 27018:2019')).toBeNull();
  });

  it('returns null for certifications with no badge', () => {
    expect(mapCertificationToBadgeType('HDS')).toBeNull();
    expect(mapCertificationToBadgeType('')).toBeNull();
  });
});

describe('extractComplianceBadges', () => {
  // CS-688 regression: Scaleway's verified certs must yield iso27001 + gdpr.
  it('extracts verified badges and skips unrecognized certs', () => {
    const badges = extractComplianceBadges({
      certifications: [
        { type: 'ISO/IEC 27001:2022', status: 'verified' },
        { type: 'HDS', status: 'verified' },
        { type: 'GDPR Compliance', status: 'verified' },
      ],
    });

    const types = badges.map((b) => b.type);
    expect(types).toContain('iso27001');
    expect(types).toContain('gdpr');
    expect(types).not.toContain('HDS');
  });

  it('ignores certifications that are not verified', () => {
    const badges = extractComplianceBadges({
      certifications: [
        { type: 'ISO/IEC 27001:2022', status: 'expired' },
        { type: 'GDPR Compliance', status: 'verified' },
      ],
    });

    expect(badges.map((b) => b.type)).toEqual(['gdpr']);
  });

  it('de-duplicates repeated badge types', () => {
    const badges = extractComplianceBadges({
      certifications: [
        { type: 'ISO/IEC 27001:2022', status: 'verified' },
        { type: 'ISO 27001:2013', status: 'verified' },
      ],
    });

    expect(badges).toEqual([{ type: 'iso27001', verified: true }]);
  });

  it('returns an empty array for missing or malformed data', () => {
    expect(extractComplianceBadges(null)).toEqual([]);
    expect(extractComplianceBadges({})).toEqual([]);
    expect(extractComplianceBadges({ certifications: 'nope' })).toEqual([]);
  });
});
