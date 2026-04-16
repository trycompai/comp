import { decideDomainVerification, deriveDnsVerified } from './domain-verification';

describe('decideDomainVerification', () => {
  const baseInputs = {
    isCnameVerified: true,
    isTxtVerified: true,
    isVercelTxtVerified: true,
    requiresVercelTxt: false,
    vercelAvailable: true,
    vercelMisconfigured: false as boolean | null,
    vercelVerifiedAfterTrigger: true as boolean | null,
  };

  it('returns success=true when all DNS passes and Vercel reports not misconfigured', () => {
    expect(decideDomainVerification(baseInputs).success).toBe(true);
  });

  it('returns success=false when Vercel reports misconfigured, even if DNS regex passes', () => {
    const result = decideDomainVerification({
      ...baseInputs,
      vercelMisconfigured: true,
    });
    expect(result.success).toBe(false);
    expect(result.error?.toLowerCase()).toContain('misconfigured');
  });

  it('returns success=false when Vercel config fetch could not confirm status (null)', () => {
    const result = decideDomainVerification({
      ...baseInputs,
      vercelMisconfigured: null,
    });
    expect(result.success).toBe(false);
    expect(result.error?.toLowerCase()).toMatch(/vercel|try again/);
  });

  it('returns success=false when the CNAME record is missing or wrong', () => {
    const result = decideDomainVerification({
      ...baseInputs,
      isCnameVerified: false,
    });
    expect(result.success).toBe(false);
  });

  it('returns success=false when the domain TXT record is missing or wrong', () => {
    const result = decideDomainVerification({
      ...baseInputs,
      isTxtVerified: false,
    });
    expect(result.success).toBe(false);
  });

  it('does not require _vercel TXT verification when cross-account verification is not required', () => {
    expect(
      decideDomainVerification({
        ...baseInputs,
        isVercelTxtVerified: false,
        requiresVercelTxt: false,
      }).success,
    ).toBe(true);
  });

  it('requires _vercel TXT verification when cross-account verification is required', () => {
    expect(
      decideDomainVerification({
        ...baseInputs,
        requiresVercelTxt: true,
        isVercelTxtVerified: false,
      }).success,
    ).toBe(false);
  });

  it('requires Vercel verify response when cross-account verification is required', () => {
    expect(
      decideDomainVerification({
        ...baseInputs,
        requiresVercelTxt: true,
        isVercelTxtVerified: true,
        vercelVerifiedAfterTrigger: false,
      }).success,
    ).toBe(false);
  });

  it('prioritizes DNS error over Vercel misconfiguration error when both fail', () => {
    const result = decideDomainVerification({
      ...baseInputs,
      isCnameVerified: false,
      vercelMisconfigured: true,
    });
    expect(result.success).toBe(false);
    expect(result.error?.toLowerCase()).toMatch(/dns|record/);
  });

  it('when Vercel is not configured on the server, trusts DNS alone (dev/self-host scenario)', () => {
    const result = decideDomainVerification({
      ...baseInputs,
      vercelAvailable: false,
      vercelMisconfigured: null,
      vercelVerifiedAfterTrigger: null,
    });
    expect(result.success).toBe(true);
  });

  it('when Vercel is not configured, still requires DNS records to match', () => {
    const result = decideDomainVerification({
      ...baseInputs,
      vercelAvailable: false,
      vercelMisconfigured: null,
      vercelVerifiedAfterTrigger: null,
      isCnameVerified: false,
    });
    expect(result.success).toBe(false);
  });

  describe('transient flag (to avoid de-verifying working domains)', () => {
    it('marks failure as transient when Vercel is reachable but config fetch failed', () => {
      const result = decideDomainVerification({
        ...baseInputs,
        vercelAvailable: true,
        vercelMisconfigured: null,
      });
      expect(result.success).toBe(false);
      expect(result.transient).toBe(true);
    });

    it('marks failure as NOT transient when Vercel explicitly reports misconfigured', () => {
      const result = decideDomainVerification({
        ...baseInputs,
        vercelMisconfigured: true,
      });
      expect(result.success).toBe(false);
      expect(result.transient).toBe(false);
    });

    it('marks failure as NOT transient when DNS records are clearly wrong', () => {
      const result = decideDomainVerification({
        ...baseInputs,
        isCnameVerified: false,
      });
      expect(result.success).toBe(false);
      expect(result.transient).toBe(false);
    });

    it('marks failure as transient when cross-account verify returns null (not explicitly false)', () => {
      const result = decideDomainVerification({
        ...baseInputs,
        requiresVercelTxt: true,
        vercelVerifiedAfterTrigger: null,
      });
      expect(result.success).toBe(false);
      expect(result.transient).toBe(true);
    });

    it('does not mark success as transient', () => {
      const result = decideDomainVerification(baseInputs);
      expect(result.success).toBe(true);
      expect(result.transient).toBeFalsy();
    });
  });
});

describe('deriveDnsVerified', () => {
  it('returns true when Vercel reports the domain is not misconfigured (CNAME)', () => {
    expect(
      deriveDnsVerified({
        dnsRegexMatches: true,
        vercelMisconfigured: false,
      }),
    ).toBe(true);
  });

  it('returns true when Vercel reports the domain is not misconfigured (A record / apex)', () => {
    expect(
      deriveDnsVerified({
        dnsRegexMatches: false,
        vercelMisconfigured: false,
      }),
    ).toBe(true);
  });

  it('returns false when Vercel reports misconfigured, even if our DNS regex matches', () => {
    expect(
      deriveDnsVerified({
        dnsRegexMatches: true,
        vercelMisconfigured: true,
      }),
    ).toBe(false);
  });

  it('falls back to DNS regex when Vercel data is not available', () => {
    expect(
      deriveDnsVerified({
        dnsRegexMatches: true,
        vercelMisconfigured: null,
      }),
    ).toBe(true);

    expect(
      deriveDnsVerified({
        dnsRegexMatches: false,
        vercelMisconfigured: null,
      }),
    ).toBe(false);
  });
});
