import type { VendorRiskAssessmentCertification } from './vendor-risk-assessment-types';

/**
 * Filter certifications to only show specific ones:
 * - ISO 27001 (with partial matching: includes "iso" and "27001")
 * - ISO 42001 (with partial matching: includes "iso" and "42001")
 * - SOC 2 Type 1 (exact match)
 * - SOC 2 Type 2 (exact match)
 * - HIPAA (exact match)
 */
export function filterCertifications(
  certifications: VendorRiskAssessmentCertification[] | null | undefined,
): VendorRiskAssessmentCertification[] {
  if (!certifications || certifications.length === 0) {
    return [];
  }

  return certifications.filter((cert) => {
    const typeLower = cert.type.toLowerCase().trim();

    // ISO 27001 - partial matching
    if (typeLower.includes('iso') && typeLower.includes('27001')) {
      return true;
    }

    // ISO 42001 - partial matching
    if (typeLower.includes('iso') && typeLower.includes('42001')) {
      return true;
    }

    // SOC 2 Type 1 - check for "soc" and "type 1" or "type i"
    if (
      typeLower.includes('soc') &&
      (typeLower.includes('type 1') || typeLower.includes('type i')) &&
      !typeLower.includes('type 2') &&
      !typeLower.includes('type ii')
    ) {
      return true;
    }

    // SOC 2 Type 2 - check for "soc" and "type 2" or "type ii"
    if (
      typeLower.includes('soc') &&
      (typeLower.includes('type 2') || typeLower.includes('type ii'))
    ) {
      return true;
    }

    // HIPAA - exact match (case insensitive)
    if (typeLower === 'hipaa' || typeLower === 'hipa') {
      return true;
    }

    return false;
  });
}

