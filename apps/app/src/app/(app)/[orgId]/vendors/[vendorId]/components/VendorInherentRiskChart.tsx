'use client';

import { useApi } from '@/hooks/use-api';
import { RiskMatrixChart } from '@/components/risks/charts/RiskMatrixChart';
import type { Vendor } from '@db';

interface InherentRiskChartProps {
  vendor: Vendor;
}

export function VendorInherentRiskChart({ vendor }: InherentRiskChartProps) {
  const api = useApi();

  return (
    <RiskMatrixChart
      title={'Inherent Risk'}
      description={'Select the inherent risk level for this vendor'}
      riskId={vendor.id}
      activeLikelihood={vendor.inherentProbability}
      activeImpact={vendor.inherentImpact}
      saveAction={async ({ id, probability, impact }) => {
        const response = await api.patch(`/v1/vendors/${id}`, {
          inherentProbability: probability,
          inherentImpact: impact,
        });
        if (response.error) {
          throw new Error('Failed to update inherent risk');
        }
        return response;
      }}
    />
  );
}
