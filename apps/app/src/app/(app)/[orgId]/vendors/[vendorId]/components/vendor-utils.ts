import type { VendorResponse } from '@/hooks/use-vendors';

export type VendorWithRiskAssessment = Omit<
  VendorResponse,
  'createdAt' | 'updatedAt' | 'riskAssessmentUpdatedAt'
> & {
  createdAt: Date;
  updatedAt: Date;
  riskAssessmentUpdatedAt?: Date | null;
};

/**
 * Normalize API response to match Prisma types
 * API returns dates as strings, Prisma returns Date objects
 */
export function normalizeVendor(apiVendor: VendorResponse): VendorWithRiskAssessment {
  return {
    ...apiVendor,
    createdAt: new Date(apiVendor.createdAt),
    updatedAt: new Date(apiVendor.updatedAt),
    riskAssessmentUpdatedAt: apiVendor.riskAssessmentUpdatedAt
      ? new Date(apiVendor.riskAssessmentUpdatedAt)
      : null,
  };
}
