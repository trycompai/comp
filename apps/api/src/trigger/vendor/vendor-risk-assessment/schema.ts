import { z } from 'zod';

export const firecrawlVendorDataSchema = z.object({
  company_description: z.string().optional().nullable(),
  privacy_policy_url: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  terms_of_service_url: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  security_overview_url: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  trust_portal_url: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  soc2_report_url: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  certified_security_frameworks: z.array(z.string()).optional().nullable(),
});

export type FirecrawlVendorData = z.infer<typeof firecrawlVendorDataSchema>;

export const vendorRiskAssessmentPayloadSchema = z.object({
  vendorId: z.string(),
  vendorName: z.string(),
  vendorWebsite: z.string().url().optional().nullable(),
  organizationId: z.string(),
  createdByUserId: z.string().optional().nullable(),
  /**
   * Backfill can set this to false to avoid expensive research calls.
   * New vendor flow defaults to true.
   */
  withResearch: z.boolean().optional().default(true),
});

export type VendorRiskAssessmentPayload = z.infer<
  typeof vendorRiskAssessmentPayloadSchema
>;


