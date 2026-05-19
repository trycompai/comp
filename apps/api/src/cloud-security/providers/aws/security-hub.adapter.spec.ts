import {
  buildRemediationText,
  deriveFindingKey,
  formatRelatedRequirements,
  mapSecurityHubFinding,
  SECURITY_HUB_SERVICE_ID,
  type SecurityHubRawFinding,
} from './security-hub.adapter';

describe('security-hub.adapter helpers', () => {
  describe('deriveFindingKey', () => {
    it('extracts the trailing control id from a foundational best-practices GeneratorId', () => {
      expect(
        deriveFindingKey('aws-foundational-security-best-practices/v/1.0.0/EC2.13'),
      ).toBe('aws-securityhub-ec2.13');
    });

    it('extracts the trailing control id from a CIS GeneratorId', () => {
      expect(
        deriveFindingKey('cis-aws-foundations-benchmark/v/1.2.0/1.1'),
      ).toBe('aws-securityhub-1.1');
    });

    it('extracts the trailing control id from a NIST GeneratorId', () => {
      expect(deriveFindingKey('nist-800-53/r/5/AC-2')).toBe(
        'aws-securityhub-ac-2',
      );
    });

    it('sanitizes characters not safe for use in identifiers', () => {
      expect(deriveFindingKey('weird:control id with spaces!')).toMatch(
        /^aws-securityhub-/,
      );
    });

    it('produces a stable key (no timestamps / randomness) so reconciliation can diff scans', () => {
      const a = deriveFindingKey('aws-foundational-security-best-practices/v/1.0.0/EC2.13');
      const b = deriveFindingKey('aws-foundational-security-best-practices/v/1.0.0/EC2.13');
      expect(a).toBe(b);
    });

    it('returns a sentinel key rather than throwing when GeneratorId is missing', () => {
      // We must always produce SOME key — the Fix pipeline gates on
      // findingKey existence, and silently disabling Fix on findings
      // without GeneratorId would be a worse UX than an "unknown" key.
      expect(deriveFindingKey(undefined)).toBe('aws-securityhub-unknown');
      expect(deriveFindingKey('')).toBe('aws-securityhub-unknown');
      expect(deriveFindingKey('   ')).toBe('aws-securityhub-unknown');
    });
  });

  describe('formatRelatedRequirements', () => {
    it('returns "" for empty/undefined input', () => {
      expect(formatRelatedRequirements(undefined)).toBe('');
      expect(formatRelatedRequirements([])).toBe('');
    });

    it('formats a NIST 800-53 requirement in parser-compatible form', () => {
      expect(formatRelatedRequirements(['NIST.800-53.r5 AC-2'])).toMatch(
        /nist.*AC-2/i,
      );
    });

    it('joins multiple requirements with "; " so the parser splits them correctly', () => {
      const result = formatRelatedRequirements([
        'NIST.800-53.r5 AC-2',
        'CIS AWS Foundations Benchmark v1.2.0 1.1',
      ]);
      expect(result).toContain('; ');
    });

    it('keeps unfamiliar requirement strings verbatim rather than dropping them', () => {
      // We never want to silently lose a compliance reference — if SecHub
      // adds a new framework format we don't recognize, we still surface
      // the raw string so the auditor sees something.
      const weird = 'SomeFutureFramework/CustomFormat#42';
      const result = formatRelatedRequirements([weird]);
      expect(result.toLowerCase()).toContain('somefutureframework');
    });
  });

  describe('buildRemediationText', () => {
    it('returns AWS text + reference URL + compliance section when all three are present', () => {
      const result = buildRemediationText({
        Remediation: {
          Recommendation: {
            Text: 'Enable encryption on the bucket.',
            Url: 'https://docs.aws.amazon.com/whatever',
          },
        },
        Compliance: { RelatedRequirements: ['NIST.800-53.r5 AC-2'] },
      });
      expect(result).toContain('Enable encryption on the bucket.');
      expect(result).toContain('More info: https://docs.aws.amazon.com/whatever');
      expect(result).toContain('Compliance:');
    });

    it('omits the More info section when no URL is present', () => {
      const result = buildRemediationText({
        Remediation: { Recommendation: { Text: 'Do the thing.' } },
      });
      expect(result).toContain('Do the thing.');
      expect(result).not.toContain('More info:');
    });

    it('omits the Compliance section when no related requirements exist', () => {
      const result = buildRemediationText({
        Remediation: { Recommendation: { Text: 'Do the thing.' } },
        Compliance: { RelatedRequirements: [] },
      });
      expect(result).not.toContain('Compliance:');
    });

    it('uses "\\n\\n" as the section separator — must match the parser contract', () => {
      // `remediation-parser.ts` splits on `\n\n`. If we use any other
      // separator, the chips disappear from the UI.
      const result = buildRemediationText({
        Remediation: {
          Recommendation: { Text: 'Step one.', Url: 'https://example.com' },
        },
        Compliance: { RelatedRequirements: ['NIST.800-53.r5 AC-2'] },
      });
      const sections = result.split('\n\n');
      expect(sections.length).toBeGreaterThanOrEqual(3);
    });

    it('returns a non-empty fallback when SecHub provides no remediation data', () => {
      const result = buildRemediationText({});
      expect(result.length).toBeGreaterThan(0);
      // The fallback string isn't load-bearing — just make sure we don't
      // surface an empty string (RemediationSection would hide the whole
      // section, which is misleading for a SecHub finding).
    });
  });

  describe('mapSecurityHubFinding', () => {
    const baseFinding: SecurityHubRawFinding = {
      Id: 'arn:aws:securityhub:us-east-1:123:finding/abc',
      Title: 'EC2 default security group should not allow inbound traffic',
      Description: 'A default security group allows broad ingress.',
      Severity: { Label: 'HIGH' },
      Resources: [{ Type: 'AwsEc2SecurityGroup', Id: 'sg-12345' }],
      AwsAccountId: '013388577167',
      Region: 'us-east-1',
      Compliance: {
        Status: 'FAILED',
        RelatedRequirements: ['NIST.800-53.r5 AC-2'],
      },
      GeneratorId:
        'aws-foundational-security-best-practices/v/1.0.0/EC2.13',
      Remediation: {
        Recommendation: {
          Text: 'Update the security group rules.',
          Url: 'https://docs.aws.amazon.com/securityhub/EC2.13',
        },
      },
      CreatedAt: '2026-05-18T10:00:00.000Z',
      UpdatedAt: '2026-05-18T10:00:00.000Z',
    };

    it('stamps evidence.findingKey so the Fix pipeline picks it up', () => {
      const mapped = mapSecurityHubFinding(baseFinding, 'us-east-1');
      expect(mapped.evidence?.findingKey).toBe('aws-securityhub-ec2.13');
    });

    it('stamps evidence.serviceId so the UI can detect SecHub findings', () => {
      const mapped = mapSecurityHubFinding(baseFinding, 'us-east-1');
      expect(mapped.evidence?.serviceId).toBe(SECURITY_HUB_SERVICE_ID);
    });

    it('builds remediation in the GCP-compatible format so the parser handles chips', () => {
      const mapped = mapSecurityHubFinding(baseFinding, 'us-east-1');
      expect(mapped.remediation).toContain('Update the security group rules.');
      expect(mapped.remediation).toContain('More info:');
      expect(mapped.remediation).toContain('Compliance:');
    });

    it('uses the finding-supplied region when available, falling back to the scan region', () => {
      const mapped = mapSecurityHubFinding(
        { ...baseFinding, Region: undefined },
        'eu-west-1',
      );
      expect(mapped.evidence?.region).toBe('eu-west-1');
    });

    it('marks the finding as not-passed for non-PASSED compliance statuses', () => {
      const mapped = mapSecurityHubFinding(baseFinding, 'us-east-1');
      expect(mapped.passed).toBe(false);
    });

    it('marks the finding as passed when SecHub reports PASSED', () => {
      const passing: SecurityHubRawFinding = {
        ...baseFinding,
        Compliance: { ...baseFinding.Compliance, Status: 'PASSED' },
      };
      const mapped = mapSecurityHubFinding(passing, 'us-east-1');
      expect(mapped.passed).toBe(true);
    });

    it('maps SecHub severity labels to our internal severity levels', () => {
      const expectations: Array<[string, string]> = [
        ['INFORMATIONAL', 'info'],
        ['LOW', 'low'],
        ['MEDIUM', 'medium'],
        ['HIGH', 'high'],
        ['CRITICAL', 'critical'],
      ];
      for (const [sechubLabel, internalLevel] of expectations) {
        const mapped = mapSecurityHubFinding(
          { ...baseFinding, Severity: { Label: sechubLabel } },
          'us-east-1',
        );
        expect(mapped.severity).toBe(internalLevel);
      }
    });

    it('defaults to medium severity when SecHub omits or returns an unknown label', () => {
      const mapped = mapSecurityHubFinding(
        { ...baseFinding, Severity: undefined },
        'us-east-1',
      );
      expect(mapped.severity).toBe('medium');
    });
  });
});
