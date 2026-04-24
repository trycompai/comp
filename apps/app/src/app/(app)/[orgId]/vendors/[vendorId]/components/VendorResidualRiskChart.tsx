'use client';

import { RiskMatrixChart } from '@/components/risks/charts/RiskMatrixChart';
import { usePermissions } from '@/hooks/use-permissions';
import { useVendor, useVendorActions } from '@/hooks/use-vendors';
import { suggestedResidual } from '@/lib/suggested-residual';
import type { TaskStatus, Vendor } from '@db';

interface ResidualRiskChartProps {
  vendor: Vendor & { tasks?: { status: TaskStatus }[] };
}

export function VendorResidualRiskChart({ vendor }: ResidualRiskChartProps) {
  const { updateVendor } = useVendorActions();
  const { mutate } = useVendor(vendor.id);
  const { hasPermission } = usePermissions();

  const suggestion = suggestedResidual({
    likelihood: vendor.inherentProbability,
    impact: vendor.inherentImpact,
    strategy: vendor.treatmentStrategy,
    tasks: vendor.tasks ?? [],
  });

  return (
    <RiskMatrixChart
      title={'Residual Risk'}
      description={
        'Risk level after the treatment plan is applied. The dashed cell is the suggestion computed from your strategy and linked task completion.'
      }
      titleInfo="Residual risk = remaining risk after the treatment plan's mitigations are in place. Compare against Inherent to see the impact of your controls."
      riskId={vendor.id}
      activeLikelihood={vendor.residualProbability}
      activeImpact={vendor.residualImpact}
      suggestedLikelihood={suggestion.likelihood}
      suggestedImpact={suggestion.impact}
      readOnly={!hasPermission('vendor', 'update')}
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
