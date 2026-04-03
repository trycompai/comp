import type { OrgFramework } from './frameworks';
import type {
  VendorRiskAssessmentDataV1,
  VendorRiskAssessmentNewsItem,
} from './agent-types';

export function buildRiskAssessmentDescription(params: {
  vendorName: string;
  vendorWebsite: string | null;
  research: VendorRiskAssessmentDataV1 | null;
  frameworkChecklist: string[];
  organizationFrameworks: OrgFramework[];
}): string {
  const { vendorName, vendorWebsite, research, frameworkChecklist } = params;

  const base: VendorRiskAssessmentDataV1 = research ?? {
    kind: 'vendorRiskAssessmentV1',
    vendorName,
    vendorWebsite,
    lastResearchedAt: null,
    riskLevel: null,
    securityAssessment: null,
    certifications: null,
    links: null,
    news: null,
  };

  // Keep the existing “framework checklist” value for humans (rendered inside the Security Assessment card).
  const checklistSuffix =
    frameworkChecklist.length > 0
      ? `\n\nFramework-specific checks:\n${frameworkChecklist.map((c) => `- ${c}`).join('\n')}`
      : '';

  return JSON.stringify({
    ...base,
    vendorName: base.vendorName ?? vendorName,
    vendorWebsite: base.vendorWebsite ?? vendorWebsite,
    securityAssessment:
      (base.securityAssessment ?? '') + checklistSuffix || null,
  } satisfies VendorRiskAssessmentDataV1);
}

/**
 * Merge news items into an existing risk assessment data object.
 * Used when core research completes first and news arrives later.
 */
export function mergeNewsIntoRiskAssessment(
  existing: VendorRiskAssessmentDataV1,
  news: VendorRiskAssessmentNewsItem[],
): VendorRiskAssessmentDataV1 {
  return {
    ...existing,
    news: news.length > 0 ? news : existing.news,
  };
}
