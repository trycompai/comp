import type {
  VendorRiskAssessmentCertification,
  VendorRiskAssessmentCertificationStatus,
} from './agent-types';

// Inline slug mapper — mirrors `mapCertificationToBadgeType` in
// vendor-risk-assessment-task.ts but lives alongside the merge logic
// so this file has no upward dependency on the orchestrating task.
// Keep in sync if new frameworks are added there.
function canonicalSlug(type: string): string {
  const normalized = type.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized.includes('soc2') || normalized.includes('soc 2')) return 'soc2';
  if (normalized.includes('iso27001') || normalized.includes('27001'))
    return 'iso27001';
  if (normalized.includes('iso42001') || normalized.includes('42001'))
    return 'iso42001';
  if (normalized.includes('iso9001') || normalized.includes('9001'))
    return 'iso9001';
  if (normalized.includes('gdpr')) return 'gdpr';
  if (normalized.includes('hipaa')) return 'hipaa';
  if (
    normalized.includes('pcidss') ||
    normalized.includes('pci') ||
    normalized.includes('paymentcard')
  )
    return 'pci_dss';
  if (normalized.includes('nen7510') || normalized.includes('7510'))
    return 'nen7510';
  // Fallback: lowercased trimmed type string
  return type.trim().toLowerCase();
}

const STATUS_PRIORITY: Record<VendorRiskAssessmentCertificationStatus, number> =
  {
    verified: 3,
    expired: 2,
    unknown: 1,
    not_certified: 0,
  };

function pickHigherStatus(
  a: VendorRiskAssessmentCertificationStatus,
  b: VendorRiskAssessmentCertificationStatus,
): VendorRiskAssessmentCertificationStatus {
  return STATUS_PRIORITY[a] >= STATUS_PRIORITY[b] ? a : b;
}

/**
 * Merge certifications from the core Firecrawl Agent and the trust-portal
 * deep-scrape, deduping by canonical slug. Status resolves via priority
 * (verified > expired > unknown > not_certified). URL/dates prefer the
 * core value when present; otherwise the deep value.
 */
export function mergeCertifications(
  core: VendorRiskAssessmentCertification[],
  deep: VendorRiskAssessmentCertification[],
): VendorRiskAssessmentCertification[] {
  if (core.length === 0) return deep;
  if (deep.length === 0) return core;

  const bySlug = new Map<string, VendorRiskAssessmentCertification>();

  // Seed with core so its URL/date values win on ties.
  for (const c of core) {
    bySlug.set(canonicalSlug(c.type), { ...c });
  }

  for (const d of deep) {
    const slug = canonicalSlug(d.type);
    const existing = bySlug.get(slug);
    if (!existing) {
      bySlug.set(slug, { ...d });
      continue;
    }

    bySlug.set(slug, {
      type: existing.type, // keep core's display type
      status: pickHigherStatus(existing.status, d.status),
      issuedAt: existing.issuedAt ?? d.issuedAt ?? null,
      expiresAt: existing.expiresAt ?? d.expiresAt ?? null,
      url: existing.url ?? d.url ?? null,
    });
  }

  return Array.from(bySlug.values());
}
