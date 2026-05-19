import { buildProviderPassthroughDescription } from './check-definition-provider-passthrough';

describe('buildProviderPassthroughDescription', () => {
  describe('GCP', () => {
    it('produces four distinct sentences for the four check-definition fields', () => {
      const result = buildProviderPassthroughDescription({
        provider: 'gcp',
        title: 'Public IP Address',
        description:
          'A Compute Engine instance has a public IP address attached.',
        evidence: {
          category: 'PUBLIC_IP_ADDRESS',
          findingClass: 'VULNERABILITY',
        },
      });

      expect(result).not.toBeNull();
      // Each of the four fields must read differently — auditors should
      // never see the same paragraph repeated under different labels.
      const fields = [
        result!.description,
        result!.passCriteria,
        result!.failCriteria,
        result!.whyItMatters,
      ];
      const uniqueFields = new Set(fields);
      expect(uniqueFields.size).toBe(4);
    });

    it('derives content from the machine-readable category, not the per-finding description', () => {
      const description =
        'A Compute Engine instance has a public IP address attached.';
      const result = buildProviderPassthroughDescription({
        provider: 'gcp',
        title: 'Public IP Address',
        description,
        evidence: {
          category: 'PUBLIC_IP_ADDRESS',
          findingClass: 'VULNERABILITY',
        },
      });

      // The four header fields must NOT contain the per-finding description
      // verbatim — that text belongs to "This account's result", not the
      // generic check definition.
      expect(result!.description).not.toContain(description);
      expect(result!.failCriteria).not.toContain(description);

      // But the humanized category must appear so the reader knows what
      // SCC is checking for.
      expect(result!.description).toContain('Public Ip Address');
      expect(result!.passCriteria).toContain('Public Ip Address');
      expect(result!.failCriteria).toContain('Public Ip Address');
    });

    it('returns null when evidence is missing', () => {
      const result = buildProviderPassthroughDescription({
        provider: 'gcp',
        title: 't',
        description: 'd',
        evidence: null,
      });
      expect(result).toBeNull();
    });

    it('returns null when category is missing from evidence', () => {
      const result = buildProviderPassthroughDescription({
        provider: 'gcp',
        title: 't',
        description: 'd',
        evidence: { findingClass: 'VULNERABILITY' },
      });
      expect(result).toBeNull();
    });

    it('uses a generic whyItMatters when findingClass is missing', () => {
      const result = buildProviderPassthroughDescription({
        provider: 'gcp',
        title: 't',
        description: 'd',
        evidence: { category: 'WEAK_PASSWORD_POLICY' },
      });
      expect(result!.whyItMatters).toBeTruthy();
      expect(result!.whyItMatters).toContain('Weak Password Policy');
    });
  });

  describe('Azure', () => {
    it('produces four distinct sentences for the four check-definition fields', () => {
      const result = buildProviderPassthroughDescription({
        provider: 'azure',
        title: 'Storage account allows public access',
        description: 'The storage account allows anonymous read access.',
        evidence: { alertType: 'Anonymous_Blob_Access' },
      });

      expect(result).not.toBeNull();
      const fields = [
        result!.description,
        result!.passCriteria,
        result!.failCriteria,
        result!.whyItMatters,
      ];
      expect(new Set(fields).size).toBe(4);
    });

    it('handles Azure findings without alertType by falling back to serviceName', () => {
      const result = buildProviderPassthroughDescription({
        provider: 'azure',
        title: 't',
        description: 'd',
        evidence: { serviceName: 'Defender for Storage' },
      });
      expect(result).not.toBeNull();
      expect(result!.description).toContain('Defender for Storage');
    });

    it('produces a description even when evidence is null (Defender baseline)', () => {
      const result = buildProviderPassthroughDescription({
        provider: 'azure',
        title: 't',
        description: 'd',
        evidence: null,
      });
      expect(result).not.toBeNull();
      // Generic Defender phrasing — no alertType available.
      expect(result!.description).toContain('Microsoft Defender for Cloud');
    });
  });

  it('returns null for unknown provider', () => {
    const result = buildProviderPassthroughDescription({
      provider: 'aws',
      title: 't',
      description: 'd',
      evidence: {},
    });
    expect(result).toBeNull();
  });
});
