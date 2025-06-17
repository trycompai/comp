'use server';

import { VendorsByCategory } from './vendors-by-category';
import { VendorsByStatus } from './vendors-by-status';

interface VendorOverviewProps {
  organizationId: string;
}

export async function VendorOverview({ organizationId }: VendorOverviewProps) {
  return (
    <div className="space-y-4">
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-full w-full">
          <VendorsByStatus organizationId={organizationId} />
        </div>
        <div className="h-full w-full">
          <VendorsByCategory organizationId={organizationId} />
        </div>
      </div>
    </div>
  );
}
