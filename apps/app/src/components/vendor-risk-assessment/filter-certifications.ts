import type { VendorRiskAssessmentCertification } from './vendor-risk-assessment-types';

/**
 * Return all certifications that have a non-empty type string.
 * Previously this was a hardcoded whitelist (SOC 2, ISO 27001, HIPAA only),
 * which silently dropped valid certs like FedRAMP, TISAX, C5, ISO 27017, etc.
 */
export function filterCertifications(
  certifications: VendorRiskAssessmentCertification[] | null | undefined,
): VendorRiskAssessmentCertification[] {
  if (!certifications || certifications.length === 0) {
    return [];
  }

  return certifications.filter(
    (cert) => cert.type && cert.type.trim().length > 0,
  );
}

