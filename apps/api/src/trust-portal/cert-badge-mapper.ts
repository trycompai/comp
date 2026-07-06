/**
 * Single source of truth for turning AI-extracted certification names
 * (`GlobalVendors.riskAssessmentData.certifications[].type`) into Trust Portal
 * compliance badge types.
 *
 * Both the admin vendor sync (`trust-portal.service.ts`) and the public,
 * visitor-facing portal (`trust-access.service.ts`) derive badges through this
 * module so the two surfaces can never disagree — the mismatch that caused
 * CS-688 (Scaleway showed ISO 27001 in the admin Vendors tab but only GDPR on
 * the public Trust Centre).
 */

export type ComplianceBadge = {
  type: string;
  verified: boolean;
};

/**
 * Whether a normalized cert string (lowercased, alphanumerics only) names the
 * given ISO standard number.
 *
 * - Requires an "iso" / "iso iec" prefix, so unrelated ids that merely contain
 *   the digits ("19001", "127001") are not misclassified.
 * - The optional "iec" handles joint ISO/IEC standards whose "IEC" infix would
 *   otherwise break the match ("ISO/IEC 27001:2022" -> "isoiec270012022").
 * - Allows an optional trailing 4-digit year ("ISO 9001:2015" -> "iso90012015")
 *   but forbids any other trailing digit, so a longer number is not read as a
 *   shorter standard ("ISO 90010" is not "ISO 9001", "ISO 27017" is not 27001).
 *
 * `standardNumber` is always a hard-coded digit literal — never user input —
 * so building the RegExp from it carries no injection risk.
 */
function matchesIsoStandard(normalized: string, standardNumber: string): boolean {
  return new RegExp(`iso(?:iec)?${standardNumber}(?:\\d{4})?(?!\\d)`).test(
    normalized,
  );
}

/**
 * Map a single certification name to its canonical badge type, or `null` when
 * the certification is not one we render a badge for.
 */
export function mapCertificationToBadgeType(certType: string): string | null {
  // Strip every non-alphanumeric char (spaces, slashes, colons, underscores)
  // so separator variants collapse to one form — "PCI DSS", "PCI-DSS" and
  // "pci_dss" all become "pcidss". Matches below therefore never need to spell
  // out separator variants.
  const normalized = certType.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (normalized.includes('soc2')) return 'soc2';
  if (matchesIsoStandard(normalized, '27001')) return 'iso27001';
  if (matchesIsoStandard(normalized, '42001')) return 'iso42001';
  if (normalized.includes('gdpr')) return 'gdpr';
  if (normalized.includes('hipaa')) return 'hipaa';
  // "pcidss" covers "PCI DSS"; "paymentcard" covers the fully spelled-out
  // "Payment Card Industry Data Security Standard" (kept in sync with the
  // scan-time mappers in trigger/vendor/vendor-risk-assessment*).
  if (normalized.includes('pcidss') || normalized.includes('paymentcard'))
    return 'pci_dss';
  if (normalized.includes('nen7510')) return 'nen7510';
  if (matchesIsoStandard(normalized, '9001')) return 'iso9001';

  return null;
}

/**
 * Extract the deduplicated set of verified compliance badges from a
 * `GlobalVendors.riskAssessmentData` object. Unrecognized certifications are
 * skipped. Returns an empty array when there is nothing to map.
 */
export function extractComplianceBadges(data: unknown): ComplianceBadge[] {
  if (!data || typeof data !== 'object') return [];

  const certifications = (data as { certifications?: unknown }).certifications;
  if (!Array.isArray(certifications)) return [];

  const badges: ComplianceBadge[] = [];
  const seenTypes = new Set<string>();

  for (const cert of certifications) {
    if (!cert || typeof cert !== 'object') continue;

    const { type, status } = cert as { type?: unknown; status?: unknown };
    if (status !== 'verified' || typeof type !== 'string') continue;

    const badgeType = mapCertificationToBadgeType(type);
    if (badgeType && !seenTypes.has(badgeType)) {
      seenTypes.add(badgeType);
      badges.push({ type: badgeType, verified: true });
    }
  }

  return badges;
}
