'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { useRiskActions } from '@/hooks/use-risks';
import type { Risk } from '@db';
import { useSWRConfig } from 'swr';
import { RiskMatrixChart } from './RiskMatrixChart';

interface ResidualRiskChartProps {
  risk: Risk;
}

export function ResidualRiskChart({ risk }: ResidualRiskChartProps) {
  const { updateRisk } = useRiskActions();
  const { mutate: globalMutate } = useSWRConfig();
  const { hasPermission } = usePermissions();

  return (
    <RiskMatrixChart
      title={'Residual Risk'}
      description={'Remaining risk level after controls are applied'}
      riskId={risk.id}
      activeLikelihood={risk.residualLikelihood}
      activeImpact={risk.residualImpact}
      readOnly={!hasPermission('risk', 'update')}
      saveAction={async ({ id, probability, impact }) => {
        await updateRisk(id, {
          residualLikelihood: probability,
          residualImpact: impact,
        });
        globalMutate(
          (key) => Array.isArray(key) && key[0]?.includes('/v1/risks'),
          undefined,
          { revalidate: true },
        );
      }}
    />
  );
}
