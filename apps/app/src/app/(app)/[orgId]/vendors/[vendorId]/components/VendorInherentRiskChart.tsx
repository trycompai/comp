'use client';

import { RiskMatrixChart } from '@/components/risks/charts/RiskMatrixChart';
import type { Vendor } from '@db';
import { updateVendorInherentRisk } from '../actions/update-vendor-inherent-risk';

interface InherentRiskChartProps {
  vendor: Vendor;
}

export function VendorInherentRiskChart({ vendor }: InherentRiskChartProps) {
  return (
    <RiskMatrixChart
      title={'Inherent Risk'}
      description={'Select the inherent risk level for this vendor'}
      riskId={vendor.id}
      activeLikelihood={vendor.inherentProbability}
      activeImpact={vendor.inherentImpact}
      saveAction={async ({ id, probability, impact }) => {
        return updateVendorInherentRisk({
          vendorId: id,
          inherentProbability: probability,
          inherentImpact: impact,
        });
      }}
    />
  );
}
