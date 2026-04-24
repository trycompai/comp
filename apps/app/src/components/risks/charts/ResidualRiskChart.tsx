'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { useRiskActions } from '@/hooks/use-risks';
import { suggestedResidual } from '@/lib/suggested-residual';
import type { Risk, TaskStatus } from '@db';
import { useSWRConfig } from 'swr';
import { RiskMatrixChart } from './RiskMatrixChart';

interface ResidualRiskChartProps {
  risk: Risk & { tasks?: { status: TaskStatus }[] };
}

export function ResidualRiskChart({ risk }: ResidualRiskChartProps) {
  const { updateRisk } = useRiskActions();
  const { mutate: globalMutate } = useSWRConfig();
  const { hasPermission } = usePermissions();

  // Only compute a suggestion when tasks are actually loaded — falling back to
  // [] would render a misleading "0% complete" ghost cell on orgs that haven't
  // hydrated yet.
  const suggestion = risk.tasks
    ? suggestedResidual({
        likelihood: risk.likelihood,
        impact: risk.impact,
        strategy: risk.treatmentStrategy,
        tasks: risk.tasks,
      })
    : undefined;

  return (
    <RiskMatrixChart
      title={'Residual Risk'}
      description={
        'Risk level after the treatment plan is applied. The dashed cell is the suggestion computed from your strategy and linked task completion.'
      }
      titleInfo="Residual risk = remaining risk after the treatment plan's mitigations are in place. Compare against Inherent to see the impact of your controls."
      riskId={risk.id}
      activeLikelihood={risk.residualLikelihood}
      activeImpact={risk.residualImpact}
      suggestedLikelihood={suggestion?.likelihood}
      suggestedImpact={suggestion?.impact}
      readOnly={!hasPermission('risk', 'update')}
      saveAction={async ({ id, probability, impact }) => {
        await updateRisk(id, {
          residualLikelihood: probability,
          residualImpact: impact,
        });
        globalMutate((key) => Array.isArray(key) && key[0]?.includes('/v1/risks'), undefined, {
          revalidate: true,
        });
      }}
    />
  );
}
