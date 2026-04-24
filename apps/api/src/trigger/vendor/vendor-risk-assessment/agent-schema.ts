import { z } from 'zod';

const urlOrEmptySchema = z
  .union([z.string().url(), z.literal('')])
  .optional()
  .nullable();
// Firecrawl may return various date formats (ISO, "YYYY-MM-DD", etc). We normalize later.
const dateStringOrEmptySchema = z
  .union([z.string(), z.literal('')])
  .optional()
  .nullable();

export const vendorRiskAssessmentAgentSchema = z.object({
  /**
   * ENG-221: replaces risk_level. Likelihood and impact are scored
   * independently so vendors can land on any cell of the 5x5 matrix
   * instead of pooling on the diagonal.
   */
  likelihood: z
    .enum(['very_unlikely', 'unlikely', 'possible', 'likely', 'very_likely'])
    .optional()
    .nullable(),
  impact: z
    .enum(['insignificant', 'minor', 'moderate', 'major', 'severe'])
    .optional()
    .nullable(),
  rationale: z.string().optional().nullable(),
  /**
   * Legacy single-dimension score retained as optional so stored payloads
   * from before ENG-221 still parse. New assessments should set
   * `likelihood` + `impact` + `rationale` instead.
   */
  risk_level: z.string().optional().nullable(),
  security_assessment: z.string().optional().nullable(),
  last_researched_at: dateStringOrEmptySchema,
  certifications: z
    .array(
      z.object({
        type: z.string(),
        status: z
          .enum(['verified', 'expired', 'not_certified', 'unknown'])
          .optional()
          .nullable(),
        issued_at: dateStringOrEmptySchema,
        expires_at: dateStringOrEmptySchema,
        url: urlOrEmptySchema,
      }),
    )
    .optional()
    .nullable(),
  links: z
    .object({
      privacy_policy_url: urlOrEmptySchema,
      terms_of_service_url: urlOrEmptySchema,
      trust_center_url: urlOrEmptySchema,
      security_page_url: urlOrEmptySchema,
      soc2_report_url: urlOrEmptySchema,
    })
    .optional()
    .nullable(),
  news: z
    .array(
      z.object({
        date: z.string(),
        title: z.string(),
        summary: z.string().optional().nullable(),
        source: z.string().optional().nullable(),
        url: urlOrEmptySchema,
        sentiment: z
          .enum(['positive', 'negative', 'neutral'])
          .optional()
          .nullable(),
      }),
    )
    .optional()
    .nullable(),
});

export type VendorRiskAssessmentAgentResult = z.infer<
  typeof vendorRiskAssessmentAgentSchema
>;
