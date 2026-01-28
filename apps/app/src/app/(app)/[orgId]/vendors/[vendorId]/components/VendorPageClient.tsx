'use client';

import { useMemo } from 'react';
import { SecondaryFields } from './secondary-fields/secondary-fields';
import { VendorHeader } from './VendorHeader';
import { VendorInherentRiskChart } from './VendorInherentRiskChart';
import { VendorResidualRiskChart } from './VendorResidualRiskChart';
import type { AssigneeOption } from '@/components/SelectAssignee';
import type { VendorWithRiskAssessment } from './vendor-utils';
import type { UpdateVendorData } from '@/hooks/use-vendors';

interface VendorPageClientProps {
  vendor: VendorWithRiskAssessment;
  assignees: AssigneeOption[];
  isViewingTask: boolean;
  isEditSheetOpen: boolean;
  onEditSheetOpenChange: (open: boolean) => void;
  onVendorUpdated: () => void;
  updateVendor: (vendorId: string, data: UpdateVendorData) => Promise<unknown>;
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
  vendor: initialVendor,
  assignees,
  isViewingTask,
  isEditSheetOpen,
  onEditSheetOpenChange,
  onVendorUpdated,
  updateVendor,
}: VendorPageClientProps) {
  const vendor = useMemo(() => initialVendor, [initialVendor]);

  return (
    <>
      {!isViewingTask && (
        <VendorHeader
          vendor={vendor}
          isEditSheetOpen={isEditSheetOpen}
          onEditSheetOpenChange={onEditSheetOpenChange}
          onVendorUpdated={onVendorUpdated}
        />
      )}
      <div className="flex flex-col gap-4">
        {!isViewingTask && (
          <>
            <SecondaryFields
              vendor={vendor}
              assignees={assignees}
              onVendorUpdated={onVendorUpdated}
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <VendorInherentRiskChart vendor={vendor} updateVendor={updateVendor} />
              <VendorResidualRiskChart vendor={vendor} updateVendor={updateVendor} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

/**
 * Export the vendor mutate function for use by mutation components
 * Call this after updating vendor data to trigger SWR revalidation
 */
export { useVendor } from '@/hooks/use-vendor';
