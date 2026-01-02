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

export type VendorRiskAssessmentNewsSentiment = 'positive' | 'negative' | 'neutral';

export type VendorRiskAssessmentNewsItem = {
  date: string;
  title: string;
  summary?: string | null;
  source?: string | null;
  url?: string | null;
  sentiment?: VendorRiskAssessmentNewsSentiment | null;
};

export type VendorRiskAssessmentDataV1 = {
  kind: 'vendorRiskAssessmentV1';
  vendorName?: string | null;
  vendorWebsite?: string | null;
  lastResearchedAt?: string | null;
  riskLevel?: string | null;
  securityAssessment?: string | null;
  certifications?: VendorRiskAssessmentCertification[] | null;
  links?: VendorRiskAssessmentLink[] | null;
  news?: VendorRiskAssessmentNewsItem[] | null;
};


