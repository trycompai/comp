'use client';

import { Comments } from '@/components/comments/Comments';
import { TaskItems } from '@/components/task-items/TaskItems';
import { useVendor, type VendorResponse } from '@/hooks/use-vendors';
import type { Member, User, Vendor, Prisma } from '@db';
import { CommentEntityType } from '@db';
import { useMemo } from 'react';
import { SecondaryFields } from './secondary-fields/secondary-fields';
import { VendorHeader } from './VendorHeader';
import { VendorInherentRiskChart } from './VendorInherentRiskChart';
import { VendorResidualRiskChart } from './VendorResidualRiskChart';

// Vendor with risk assessment data merged from GlobalVendors
type VendorWithRiskAssessment = Vendor & {
  assignee: { user: User | null } | null;
  riskAssessmentData?: Prisma.InputJsonValue | null;
  riskAssessmentVersion?: string | null;
  riskAssessmentUpdatedAt?: Date | null;
};

/**
 * Normalize API response to match Prisma types
 * API returns dates as strings, Prisma returns Date objects
 */
function normalizeVendor(apiVendor: VendorResponse): VendorWithRiskAssessment {
  return {
    ...apiVendor,
    createdAt: new Date(apiVendor.createdAt),
    updatedAt: new Date(apiVendor.updatedAt),
    riskAssessmentUpdatedAt: apiVendor.riskAssessmentUpdatedAt
      ? new Date(apiVendor.riskAssessmentUpdatedAt)
      : null,
    assignee: apiVendor.assignee
      ? {
          ...apiVendor.assignee,
          user: apiVendor.assignee.user as User | null,
        }
      : null,
  } as unknown as VendorWithRiskAssessment;
}

interface VendorPageClientProps {
  vendorId: string;
  orgId: string;
  initialVendor: VendorWithRiskAssessment;
  assignees: (Member & { user: User })[];
  isViewingTask: boolean;
}

/**
 * Client component for vendor detail page content
 * Uses SWR for real-time updates and caching
 *
 * Benefits:
 * - Instant initial render (uses server-fetched data)
 * - Real-time updates via polling (5s interval)
 * - Mutations trigger automatic refresh via mutate()
 */
export function VendorPageClient({
  vendorId,
  orgId,
  initialVendor,
  assignees,
  isViewingTask,
}: VendorPageClientProps) {
  // Use SWR for real-time updates with polling
  const { vendor: swrVendor, mutate: refreshVendor } = useVendor(vendorId, {
    organizationId: orgId,
  });

  // Normalize and memoize the vendor data
  // Use SWR data when available, fall back to initial data
  const vendor = useMemo(() => {
    if (swrVendor) {
      return normalizeVendor(swrVendor);
    }
    return initialVendor;
  }, [swrVendor, initialVendor]);

  return (
    <>
      {!isViewingTask && <VendorHeader vendor={vendor} />}
      <div className="flex flex-col gap-4">
        {!isViewingTask && (
          <>
            <SecondaryFields vendor={vendor} assignees={assignees} onUpdate={refreshVendor} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <VendorInherentRiskChart vendor={vendor} />
              <VendorResidualRiskChart vendor={vendor} />
            </div>
          </>
        )}
        <TaskItems entityId={vendorId} entityType="vendor" organizationId={orgId} />
        {!isViewingTask && (
          <Comments
            entityId={vendorId}
            entityType={CommentEntityType.vendor}
            organizationId={orgId}
          />
        )}
      </div>
    </>
  );
}

/**
 * Export the vendor mutate function for use by mutation components
 * Call this after updating vendor data to trigger SWR revalidation
 */
export { useVendor } from '@/hooks/use-vendors';
