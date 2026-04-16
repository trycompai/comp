export interface DomainVerificationInputs {
  /** Did the DNS CNAME record resolve and match a known Vercel target? */
  isCnameVerified: boolean;
  /** Did the DNS TXT record at the root match `compai-domain-verification=<orgId>`? */
  isTxtVerified: boolean;
  /** Did the DNS TXT at `_vercel` match the token Vercel gave us? */
  isVercelTxtVerified: boolean;
  /**
   * Whether Vercel requires the `_vercel` TXT record for ownership verification.
   * True for cross-account domains where Vercel cannot infer ownership from DNS alone.
   */
  requiresVercelTxt: boolean;
  /**
   * Whether the Vercel integration is configured on the server. False in dev or
   * self-hosted setups without VERCEL_TEAM_ID / TRUST_PORTAL_PROJECT_ID — in
   * that case we fall back to DNS-only verification.
   */
  vercelAvailable: boolean;
  /**
   * `misconfigured` flag from Vercel's `/v6/domains/{d}/config` endpoint.
   * `null` means the call failed — in that case we cannot confirm Vercel's verdict.
   */
  vercelMisconfigured: boolean | null;
  /**
   * Response from triggering Vercel's `/verify` endpoint. Only meaningful for
   * cross-account domains. `null` means the call was skipped or errored.
   */
  vercelVerifiedAfterTrigger: boolean | null;
}

export interface DomainVerificationResult {
  success: boolean;
  error?: string;
  /**
   * True when the failure is due to a transient/indeterminate condition
   * (Vercel API unreachable, no verdict available yet). Callers should avoid
   * writing `domainVerified=false` on transient failures — doing so can
   * de-verify a previously working domain on a temporary outage.
   */
  transient?: boolean;
}

export interface DnsVerifiedInputs {
  /** Whether the resolved CNAME target matched a known Vercel DNS pattern. */
  dnsRegexMatches: boolean;
  /**
   * `misconfigured` from Vercel's `/v6/domains/{d}/config`. `null` when the
   * call failed or Vercel isn't configured on the server.
   */
  vercelMisconfigured: boolean | null;
}

/**
 * Vercel hosts these domains, so Vercel is the source of truth for whether the
 * DNS points at the right project. We accept any configuration method Vercel
 * accepts (CNAME for subdomains, A for apex, ALIAS, etc.) — `misconfigured`
 * is Vercel's single "works / doesn't work" verdict. Our regex is only a
 * fallback for when Vercel's API is unreachable.
 */
export function deriveDnsVerified(inputs: DnsVerifiedInputs): boolean {
  if (inputs.vercelMisconfigured !== null) {
    return !inputs.vercelMisconfigured;
  }
  return inputs.dnsRegexMatches;
}

export function decideDomainVerification(
  inputs: DomainVerificationInputs,
): DomainVerificationResult {
  const {
    isCnameVerified,
    isTxtVerified,
    isVercelTxtVerified,
    requiresVercelTxt,
    vercelAvailable,
    vercelMisconfigured,
    vercelVerifiedAfterTrigger,
  } = inputs;

  // DNS-level checks — user is responsible for these
  const dnsOk =
    isCnameVerified &&
    isTxtVerified &&
    (!requiresVercelTxt || isVercelTxtVerified);

  if (!dnsOk) {
    return {
      success: false,
      transient: false,
      error:
        'Some DNS records are not configured correctly. Please check the records marked as unverified above and try again.',
    };
  }

  // Vercel not configured on this server — trust DNS alone (dev/self-host).
  if (!vercelAvailable) {
    return { success: true };
  }

  // Vercel-level checks — DNS may look right to us but Vercel must agree
  if (vercelMisconfigured === null) {
    return {
      success: false,
      transient: true,
      error:
        'Could not confirm configuration with Vercel. Please try again in a few minutes.',
    };
  }

  if (vercelMisconfigured === true) {
    return {
      success: false,
      transient: false,
      error:
        'Vercel reports this domain is still misconfigured. The CNAME value must exactly match the recommended target shown above.',
    };
  }

  if (requiresVercelTxt && vercelVerifiedAfterTrigger !== true) {
    // `null` means the /verify call failed (transient); `false` means Vercel
    // explicitly said the ownership record is not yet present.
    return {
      success: false,
      transient: vercelVerifiedAfterTrigger === null,
      error:
        'DNS records verified but Vercel has not yet confirmed domain ownership. Please ensure the _vercel TXT record is correctly configured and try again.',
    };
  }

  return { success: true };
}
