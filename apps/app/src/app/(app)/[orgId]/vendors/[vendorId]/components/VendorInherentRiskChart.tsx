'use client';

import { RiskMatrixChart } from '@/components/risks/charts/RiskMatrixChart';
import type { Vendor } from '@db';
import { useGT } from 'gt-next';
import { updateVendorInherentRisk } from '../actions/update-vendor-inherent-risk';

interface InherentRiskChartProps {
  vendor: Vendor;
}

export function VendorInherentRiskChart({ vendor }: InherentRiskChartProps) {
  const t = useGT();

  return (
    <RiskMatrixChart
      title={t('Inherent Risk')}
      description={t('Select the inherent risk level for this vendor')}
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
