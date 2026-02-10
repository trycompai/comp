'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { useVendor, useVendorActions } from '@/hooks/use-vendors';
import { RiskMatrixChart } from '@/components/risks/charts/RiskMatrixChart';
import type { Vendor } from '@db';

interface InherentRiskChartProps {
  vendor: Vendor;
}

export function VendorInherentRiskChart({ vendor }: InherentRiskChartProps) {
  const { updateVendor } = useVendorActions();
  const { mutate } = useVendor(vendor.id);
  const { hasPermission } = usePermissions();

  return (
    <RiskMatrixChart
      title={'Inherent Risk'}
      description={'Select the inherent risk level for this vendor'}
      riskId={vendor.id}
      activeLikelihood={vendor.inherentProbability}
      activeImpact={vendor.inherentImpact}
      readOnly={!hasPermission('vendor', 'assess')}
      saveAction={async ({ id, probability, impact }) => {
        await updateVendor(id, {
          inherentProbability: probability,
          inherentImpact: impact,
        });
        mutate();
      }}
    />
  );
}
