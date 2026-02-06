'use client';

import { useApi } from '@/hooks/use-api';
import { RiskMatrixChart } from '@/components/risks/charts/RiskMatrixChart';
import type { Vendor } from '@db';

interface ResidualRiskChartProps {
  vendor: Vendor;
}

export function VendorResidualRiskChart({ vendor }: ResidualRiskChartProps) {
  const api = useApi();

  return (
    <RiskMatrixChart
      title={'Residual Risk'}
      description={'Select the residual risk level for this vendor'}
      riskId={vendor.id}
      activeLikelihood={vendor.residualProbability}
      activeImpact={vendor.residualImpact}
      saveAction={async ({ id, probability, impact }) => {
        const response = await api.patch(`/v1/vendors/${id}`, {
          residualProbability: probability,
          residualImpact: impact,
        });
        if (response.error) {
          throw new Error('Failed to update residual risk');
        }
        return response;
      }}
    />
  );
}
