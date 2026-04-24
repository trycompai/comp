export type VendorRiskAssessmentCertificationStatus =
  | 'verified'
  | 'expired'
  | 'not_certified'
  | 'unknown';

export type VendorRiskAssessmentCertification = {
  type: string;
  status: VendorRiskAssessmentCertificationStatus;
  issuedAt?: string | null;
  expiresAt?: string | null;
  url?: string | null;
};

export type VendorRiskAssessmentLink = {
  label: string;
  url: string;
};

export type VendorRiskAssessmentNewsSentiment =
  | 'positive'
  | 'negative'
  | 'neutral';

export type VendorRiskAssessmentNewsItem = {
  date: string;
  title: string;
  summary?: string | null;
  source?: string | null;
  url?: string | null;
  sentiment?: VendorRiskAssessmentNewsSentiment | null;
};

/**
 * Likelihood enum string values — mirrors the Prisma `Likelihood` enum.
 * Kept as a literal union here so this module stays independent from
 * `@db` / `@prisma/client`.
 */
export type VendorRiskAssessmentLikelihood =
  | 'very_unlikely'
  | 'unlikely'
  | 'possible'
  | 'likely'
  | 'very_likely';

/**
 * Impact enum string values — mirrors the Prisma `Impact` enum.
 */
export type VendorRiskAssessmentImpact =
  | 'insignificant'
  | 'minor'
  | 'moderate'
  | 'major'
  | 'severe';

export type VendorRiskAssessmentDataV1 = {
  kind: 'vendorRiskAssessmentV1';
  vendorName?: string | null;
  vendorWebsite?: string | null;
  lastResearchedAt?: string | null;
  /**
   * ENG-221: two independent dimensions. Preferred over the legacy
   * single-bucket `riskLevel`. New assessments always set these; legacy
   * payloads may only have `riskLevel`.
   */
  likelihood?: VendorRiskAssessmentLikelihood | null;
  impact?: VendorRiskAssessmentImpact | null;
  rationale?: string | null;
  /** Legacy single-bucket score. Retained for pre-ENG-221 payloads. */
  riskLevel?: string | null;
  securityAssessment?: string | null;
  certifications?: VendorRiskAssessmentCertification[] | null;
  links?: VendorRiskAssessmentLink[] | null;
  news?: VendorRiskAssessmentNewsItem[] | null;
};
