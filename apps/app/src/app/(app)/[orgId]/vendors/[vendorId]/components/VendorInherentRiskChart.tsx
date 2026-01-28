'use client';

import { RiskMatrixChart } from '@/components/risks/charts/RiskMatrixChart';
import type { Vendor } from '@db';
import type { UpdateVendorData } from '@/hooks/use-vendors';
import { toast } from 'sonner';

interface InherentRiskChartProps {
  vendor: Vendor;
  updateVendor: (vendorId: string, data: UpdateVendorData) => Promise<unknown>;
}

export function VendorInherentRiskChart({ vendor, updateVendor }: InherentRiskChartProps) {
  return (
    <RiskMatrixChart
      title={'Inherent Risk'}
      description={'Select the inherent risk level for this vendor'}
      riskId={vendor.id}
      activeLikelihood={vendor.inherentProbability}
      activeImpact={vendor.inherentImpact}
      saveAction={async ({ id, probability, impact }) => {
        try {
          await updateVendor(id, {
            inherentProbability: probability,
            inherentImpact: impact,
          });
          toast.success('Inherent risk updated');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to update inherent risk');
          throw error;
        }
      }}
    />
  );
}
