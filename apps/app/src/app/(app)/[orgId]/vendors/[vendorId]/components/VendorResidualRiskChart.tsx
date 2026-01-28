'use client';

import { RiskMatrixChart } from '@/components/risks/charts/RiskMatrixChart';
import type { Vendor } from '@db';
import type { UpdateVendorData } from '@/hooks/use-vendors';
import { toast } from 'sonner';

interface ResidualRiskChartProps {
  vendor: Vendor;
  updateVendor: (vendorId: string, data: UpdateVendorData) => Promise<unknown>;
}

export function VendorResidualRiskChart({ vendor, updateVendor }: ResidualRiskChartProps) {
  return (
    <RiskMatrixChart
      title={'Residual Risk'}
      description={'Select the residual risk level for this vendor'}
      riskId={vendor.id}
      activeLikelihood={vendor.residualProbability}
      activeImpact={vendor.residualImpact}
      saveAction={async ({ id, probability, impact }) => {
        try {
          await updateVendor(id, {
            residualProbability: probability,
            residualImpact: impact,
          });
          toast.success('Residual risk updated');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to update residual risk');
          throw error;
        }
      }}
    />
  );
}
