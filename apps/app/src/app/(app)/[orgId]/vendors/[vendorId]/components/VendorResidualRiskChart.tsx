'use client';

import { RiskMatrixChart } from '@/components/risks/charts/RiskMatrixChart';
import type { Vendor } from '@db';
import { useGT } from 'gt-next';
import { updateVendorResidualRisk } from '../actions/update-vendor-residual-risk';

interface ResidualRiskChartProps {
  vendor: Vendor;
}

export function VendorResidualRiskChart({ vendor }: ResidualRiskChartProps) {
  const t = useGT();
  
  return (
    <RiskMatrixChart
      title={t('Residual Risk')}
      description={t('Select the residual risk level for this vendor')}
      riskId={vendor.id}
      activeLikelihood={vendor.residualProbability}
      activeImpact={vendor.residualImpact}
      saveAction={async ({ id, probability, impact }) => {
        return updateVendorResidualRisk({
          vendorId: id,
          residualProbability: probability,
          residualImpact: impact,
        });
      }}
    />
  );
}
