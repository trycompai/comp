export interface TrustPortalConfiguredInput {
  domain?: string | null;
  contactEmail?: string | null;
  overviewContent?: string | null;
  favicon?: string | null;
  /** Organization.trustPortalFaqs — Json?, expected to be an array when set. */
  faqs?: unknown;
  /** Raw Trust framework boolean columns (soc2, soc2type1, … ccpa). */
  frameworkFlags: boolean[];
  documentCount: number;
  resourceCount: number;
  customLinkCount: number;
}

/**
 * A Trust Portal is "configured" once the org has done anything beyond the
 * shared-domain defaults. Used to decide whether to nudge the customer to set
 * it up. Computed from RAW values (the settings endpoint substitutes a Context
 * Hub default for overviewContent — do not pass the substituted value here).
 */
export function isTrustPortalConfigured(input: TrustPortalConfiguredInput): boolean {
  const hasFaqs = Array.isArray(input.faqs) && input.faqs.length > 0;
  const hasFramework = input.frameworkFlags.some(Boolean);

  return Boolean(
    input.domain ||
      input.contactEmail ||
      input.overviewContent ||
      input.favicon ||
      hasFaqs ||
      hasFramework ||
      input.documentCount > 0 ||
      input.resourceCount > 0 ||
      input.customLinkCount > 0,
  );
}
