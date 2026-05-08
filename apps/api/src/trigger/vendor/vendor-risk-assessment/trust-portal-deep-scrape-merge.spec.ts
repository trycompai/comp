import type { VendorRiskAssessmentCertification } from './agent-types';
import { mergeCertifications } from './trust-portal-deep-scrape-merge';

const cert = (
  overrides: Partial<VendorRiskAssessmentCertification> = {},
): VendorRiskAssessmentCertification => ({
  type: 'SOC 2 Type II',
  status: 'verified',
  issuedAt: null,
  expiresAt: null,
  url: null,
  ...overrides,
});

describe('mergeCertifications', () => {
  it('returns core untouched when deep is empty', () => {
    const core = [cert({ type: 'SOC 2 Type II' })];
    expect(mergeCertifications(core, [])).toEqual(core);
  });

  it('returns deep when core is empty', () => {
    const deep = [cert({ type: 'ISO 27001' })];
    expect(mergeCertifications([], deep)).toEqual(deep);
  });

  it('dedupes by canonical slug (SOC 2 variants collapse)', () => {
    const core = [cert({ type: 'SOC 2 Type II', status: 'verified' })];
    const deep = [cert({ type: 'SOC2', status: 'unknown' })];

    const result = mergeCertifications(core, deep);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('verified');
  });

  it('verified wins over unknown regardless of source side', () => {
    const core = [cert({ type: 'ISO 27001', status: 'unknown' })];
    const deep = [cert({ type: 'ISO 27001', status: 'verified' })];

    const result = mergeCertifications(core, deep);

    expect(result[0].status).toBe('verified');
  });

  it('status priority: verified > expired > unknown > not_certified', () => {
    const cases: Array<{
      a: VendorRiskAssessmentCertification['status'];
      b: VendorRiskAssessmentCertification['status'];
      expected: VendorRiskAssessmentCertification['status'];
    }> = [
      { a: 'expired', b: 'unknown', expected: 'expired' },
      { a: 'unknown', b: 'not_certified', expected: 'unknown' },
      { a: 'verified', b: 'expired', expected: 'verified' },
      { a: 'not_certified', b: 'verified', expected: 'verified' },
    ];

    for (const { a, b, expected } of cases) {
      const result = mergeCertifications(
        [cert({ type: 'PCI DSS', status: a })],
        [cert({ type: 'PCI DSS', status: b })],
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(expected);
    }
  });

  it('preserves url/dates from whichever side provides them', () => {
    const core = [
      cert({
        type: 'ISO 27001',
        status: 'unknown',
        url: null,
        issuedAt: null,
      }),
    ];
    const deep = [
      cert({
        type: 'ISO 27001',
        status: 'verified',
        url: 'https://acme.com/iso.pdf',
        issuedAt: '2025-03-01T00:00:00.000Z',
      }),
    ];

    const result = mergeCertifications(core, deep);

    expect(result[0]).toMatchObject({
      type: 'ISO 27001',
      status: 'verified',
      url: 'https://acme.com/iso.pdf',
      issuedAt: '2025-03-01T00:00:00.000Z',
    });
  });

  it('prefers core url/dates when both sides have them', () => {
    const core = [
      cert({
        type: 'SOC 2 Type II',
        status: 'verified',
        url: 'https://core.example.com/soc2',
        issuedAt: '2025-01-01T00:00:00.000Z',
      }),
    ];
    const deep = [
      cert({
        type: 'SOC 2 Type II',
        status: 'verified',
        url: 'https://deep.example.com/soc2',
        issuedAt: '2024-01-01T00:00:00.000Z',
      }),
    ];

    const result = mergeCertifications(core, deep);

    expect(result[0].url).toBe('https://core.example.com/soc2');
    expect(result[0].issuedAt).toBe('2025-01-01T00:00:00.000Z');
  });

  it('keeps distinct certifications when slugs differ', () => {
    const core = [cert({ type: 'SOC 2 Type II' })];
    const deep = [
      cert({ type: 'ISO 27001' }),
      cert({ type: 'PCI DSS' }),
    ];

    const result = mergeCertifications(core, deep);

    expect(result).toHaveLength(3);
    expect(result.map((c) => c.type).sort()).toEqual([
      'ISO 27001',
      'PCI DSS',
      'SOC 2 Type II',
    ]);
  });

  it('falls back to lowercased type when the slug mapper returns null', () => {
    const core = [cert({ type: 'FooBar Framework', status: 'unknown' })];
    const deep = [cert({ type: 'foobar framework', status: 'verified' })];

    const result = mergeCertifications(core, deep);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('verified');
  });
});
