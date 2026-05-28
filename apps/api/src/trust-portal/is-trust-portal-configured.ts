export interface TrustPortalConfiguredInput {
  domain?: string | null;
  contactEmail?: string | null;
  overviewContent?: string | null;
  favicon?: string | null;
  /** Organization.trustPortalFaqs — Json?, expected to be an array when set. */
  faqs?: unknown;
  /**
   * Raw Trust framework "enabled" boolean columns (soc2, soc2type1, soc2type2,
   * soc3, iso27001, iso42001, nen7510, gdpr, hipaa, pci_dss, iso9001, pipeda,
   * ccpa). Order is irrelevant — any `true` counts as configured. The caller is
   * responsible for passing all of them; a dropped column silently weakens the
   * signal. Distinct from `resourceCount` (uploaded certificate files).
   */
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
