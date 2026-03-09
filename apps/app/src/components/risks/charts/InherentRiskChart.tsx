'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { useRiskActions } from '@/hooks/use-risks';
import type { Risk } from '@db';
import { useSWRConfig } from 'swr';
import { RiskMatrixChart } from './RiskMatrixChart';

interface InherentRiskChartProps {
  risk: Risk;
}

export function InherentRiskChart({ risk }: InherentRiskChartProps) {
  const { updateRisk } = useRiskActions();
  const { mutate: globalMutate } = useSWRConfig();
  const { hasPermission } = usePermissions();

  return (
    <RiskMatrixChart
      title={'Inherent Risk'}
      description={'Initial risk level before any controls are applied'}
      riskId={risk.id}
      activeLikelihood={risk.likelihood}
      activeImpact={risk.impact}
      readOnly={!hasPermission('risk', 'update')}
      saveAction={async ({ id, probability, impact }) => {
        await updateRisk(id, {
          likelihood: probability,
          impact,
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
