import {
  buildCheckDescriptionPrompt,
  checkDescriptionSchema,
  findForbiddenContent,
} from './ai-description.prompt';

describe('ai-description.prompt', () => {
  describe('checkDescriptionSchema', () => {
    it('accepts a well-formed Tier 3 description', () => {
      const parsed = checkDescriptionSchema.safeParse({
        title: 'IAM password policy enforces 14+ character minimum',
        description:
          'Verifies that the AWS account password policy requires user passwords to be at least 14 characters long.',
        passCriteria:
          'Password policy exists AND MinimumPasswordLength >= 14',
        failCriteria:
          'No password policy is configured OR MinimumPasswordLength < 14',
        whyItMatters:
          'Short passwords are vulnerable to brute force attacks and credential stuffing.',
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects fields below minimum length', () => {
      const parsed = checkDescriptionSchema.safeParse({
        title: '',
        description: 'short',
        passCriteria: 'x',
        failCriteria: 'y',
        whyItMatters: 'z',
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe('findForbiddenContent', () => {
    const baseline = {
      title: 'IAM password policy enforces 14+ character minimum',
      description:
        'Verifies that the AWS account password policy requires user passwords to be at least 14 characters long.',
      passCriteria:
        'Password policy exists AND MinimumPasswordLength >= 14',
      failCriteria:
        'No password policy is configured OR MinimumPasswordLength < 14',
      whyItMatters:
        'Short passwords are vulnerable to brute force attacks and credential stuffing.',
    };

    it('returns null for clean output', () => {
      expect(findForbiddenContent(baseline)).toBeNull();
    });

    it('flags SOC 2 control numbers', () => {
      expect(
        findForbiddenContent({
          ...baseline,
          whyItMatters:
            'This check aligns with SOC 2 CC6.1 logical access controls.',
        }),
      ).toMatchObject({ field: 'whyItMatters' });
    });

    it('flags ISO 27001 references', () => {
      expect(
        findForbiddenContent({
          ...baseline,
          whyItMatters: 'Required by ISO 27001 A.9.4.3.',
        }),
      ).toMatchObject({ field: 'whyItMatters' });
    });

    it('flags HIPAA / NIST framework citations', () => {
      expect(
        findForbiddenContent({
          ...baseline,
          description: 'HIPAA-aligned password requirement.',
        }),
      ).toMatchObject({ field: 'description' });
      expect(
        findForbiddenContent({
          ...baseline,
          description: 'Maps to NIST AC-2.',
        }),
      ).toMatchObject({ field: 'description' });
    });

    it('flags any URL', () => {
      expect(
        findForbiddenContent({
          ...baseline,
          whyItMatters: 'See https://docs.aws.amazon.com for more info.',
        }),
      ).toMatchObject({ field: 'whyItMatters' });
      expect(
        findForbiddenContent({
          ...baseline,
          description: 'Reference: www.cisecurity.org/benchmark.',
        }),
      ).toMatchObject({ field: 'description' });
    });

    it('flags CC<number>.<number> control patterns even without "SOC 2"', () => {
      expect(
        findForbiddenContent({
          ...baseline,
          passCriteria: 'Control reference: CC7.1',
        }),
      ).toMatchObject({ field: 'passCriteria' });
    });

    it('flags bare CIS/PCI/NIST/HIPAA control numbers (e.g. "CIS 1.8")', () => {
      expect(
        findForbiddenContent({
          ...baseline,
          whyItMatters: 'Aligns with CIS 1.8 best practices.',
        }),
      ).toMatchObject({ field: 'whyItMatters' });
      expect(
        findForbiddenContent({
          ...baseline,
          whyItMatters: 'Required by PCI 8.2.3.',
        }),
      ).toMatchObject({ field: 'whyItMatters' });
      expect(
        findForbiddenContent({
          ...baseline,
          whyItMatters: 'See also: NIST AC-2.',
        }),
      ).toMatchObject({ field: 'whyItMatters' });
      expect(
        findForbiddenContent({
          ...baseline,
          whyItMatters: 'Maps to HIPAA 164.312.',
        }),
      ).toMatchObject({ field: 'whyItMatters' });
    });
  });


  describe('buildCheckDescriptionPrompt', () => {
    it('includes provider, severity, title and description', () => {
      const prompt = buildCheckDescriptionPrompt({
        provider: 'aws',
        serviceName: 'IAM',
        title: 'IAM user "john" does not have MFA enabled',
        description: 'User john has no MFA device configured.',
        severity: 'high',
        remediation: 'Enable MFA via IAM console.',
      });
      expect(prompt).toContain('AWS');
      expect(prompt).toContain('IAM');
      expect(prompt).toContain('high');
      expect(prompt).toContain('john');
      expect(prompt).toContain('Enable MFA');
    });

    it('omits null/empty fields cleanly', () => {
      const prompt = buildCheckDescriptionPrompt({
        provider: 'aws',
        serviceName: null,
        title: 'Untitled finding',
        description: null,
        severity: null,
        remediation: null,
      });
      expect(prompt).toContain('Untitled finding');
      expect(prompt).not.toContain('Service:');
      expect(prompt).not.toContain('Finding description:');
      expect(prompt).not.toContain('Suggested remediation:');
    });
  });
});
