'use client';

import { RiskMatrixChart } from '@/components/risks/charts/RiskMatrixChart';
import { NotAssessedState } from '@/components/risks/treatment-plan/NotAssessedState';
import { usePermissions } from '@/hooks/use-permissions';
import { useVendor, useVendorActions } from '@/hooks/use-vendors';
import { suggestedResidual } from '@/lib/suggested-residual';
import { VendorStatus, type TaskStatus, type Vendor } from '@db';
import { toast } from 'sonner';

interface ResidualRiskChartProps {
  vendor: Vendor & { tasks?: { status: TaskStatus }[] };
}

export function VendorResidualRiskChart({ vendor }: ResidualRiskChartProps) {
  const { updateVendor, triggerAssessment } = useVendorActions();
  const { mutate } = useVendor(vendor.id);
  const { hasPermission } = usePermissions();

  const canUpdate = hasPermission('vendor', 'update');

  if (vendor.status === VendorStatus.not_assessed) {
    return (
      <NotAssessedState
        disabled={!canUpdate}
        onAssess={async () => {
          try {
            await triggerAssessment(vendor.id);
            toast.success('Risk assessment started. This may take a moment.');
            await mutate();
          } catch {
            toast.error('Failed to start risk assessment');
          }
        }}
      />
    );
  }

  // Only compute a suggestion when tasks are actually loaded — falling back to
  // [] would render a misleading "0% complete" ghost cell on vendors that
  // haven't hydrated yet.
  const suggestion = vendor.tasks
    ? suggestedResidual({
        likelihood: vendor.inherentProbability,
        impact: vendor.inherentImpact,
        strategy: vendor.treatmentStrategy,
        tasks: vendor.tasks,
      })
    : undefined;

  const preliminary = vendor.status === VendorStatus.in_progress;

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
      suggestedLikelihood={suggestion?.likelihood}
      suggestedImpact={suggestion?.impact}
      readOnly={!canUpdate}
      preliminary={preliminary}
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
