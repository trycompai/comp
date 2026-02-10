'use client';

import { useVendor, useVendorActions } from '@/hooks/use-vendors';
import { RiskMatrixChart } from '@/components/risks/charts/RiskMatrixChart';
import type { Vendor } from '@db';

interface ResidualRiskChartProps {
  vendor: Vendor;
}

export function VendorResidualRiskChart({ vendor }: ResidualRiskChartProps) {
  const { updateVendor } = useVendorActions();
  const { mutate } = useVendor(vendor.id);

  return (
    <RiskMatrixChart
      title={'Residual Risk'}
      description={'Select the residual risk level for this vendor'}
      riskId={vendor.id}
      activeLikelihood={vendor.residualProbability}
      activeImpact={vendor.residualImpact}
      saveAction={async ({ id, probability, impact }) => {
        await updateVendor(id, {
          residualProbability: probability,
          residualImpact: impact,
        });
        mutate();
      }}
    />
  );
}
