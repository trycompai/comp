'use client';

import { Comments } from '@/components/comments/Comments';
import { TaskItems } from '@/components/task-items/TaskItems';
import { useVendor } from '@/hooks/use-vendors';
import { CommentEntityType } from '@db';
import type { Member, User, Vendor } from '@db';
import type { Prisma } from '@prisma/client';
import { SecondaryFields } from './secondary-fields/secondary-fields';
import { VendorHeader } from './VendorHeader';
import { VendorInherentRiskChart } from './VendorInherentRiskChart';
import { VendorResidualRiskChart } from './VendorResidualRiskChart';
import { VendorTabs } from './VendorTabs';

// Vendor with risk assessment data merged from GlobalVendors
type VendorWithRiskAssessment = Vendor & {
  assignee: { user: User | null } | null;
  riskAssessmentData?: Prisma.InputJsonValue | null;
  riskAssessmentVersion?: string | null;
  riskAssessmentUpdatedAt?: Date | null;
};

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
 * - Background revalidation keeps data fresh
 * - Mutations trigger automatic refresh via mutate()
 */
export function VendorPageClient({
  vendorId,
  orgId,
  initialVendor,
  assignees,
  isViewingTask,
}: VendorPageClientProps) {
  // Initialize SWR cache with this vendor for shared cache across components
  // VendorActions and other components that use useVendor(vendorId) will share this cache
  // When they call mutate(), it warms the cache for subsequent page loads
  useVendor(vendorId, {
    organizationId: orgId,
    revalidateOnMount: false, // Don't fetch on mount - we have server data
    revalidateOnFocus: false,
  });

  // Use server-fetched vendor for display
  // Server data includes GlobalVendors merge which API doesn't provide
  // SWR cache is used by mutation components (VendorActions) for revalidation
  const vendor = initialVendor;

  return (
    <>
      {!isViewingTask && <VendorHeader vendor={vendor} />}
      {!isViewingTask && <VendorTabs vendorId={vendorId} orgId={orgId} />}
      <div className="flex flex-col gap-4">
        {!isViewingTask && (
          <>
            <SecondaryFields vendor={vendor} assignees={assignees} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <VendorInherentRiskChart vendor={vendor} />
              <VendorResidualRiskChart vendor={vendor} />
            </div>
          </>
        )}
        <TaskItems
          entityId={vendorId}
          entityType="vendor"
          organizationId={orgId}
        />
        {!isViewingTask && (
          <Comments entityId={vendorId} entityType={CommentEntityType.vendor} />
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

