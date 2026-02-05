'use client';

import { useApi } from '@/hooks/use-api';
import type { Risk } from '@db';
import { useSWRConfig } from 'swr';
import { RiskMatrixChart } from './RiskMatrixChart';

interface InherentRiskChartProps {
  risk: Risk;
}

export function InherentRiskChart({ risk }: InherentRiskChartProps) {
  const api = useApi();
  const { mutate: globalMutate } = useSWRConfig();

  return (
    <RiskMatrixChart
      title={'Inherent Risk'}
      description={'Initial risk level before any controls are applied'}
      riskId={risk.id}
      activeLikelihood={risk.likelihood}
      activeImpact={risk.impact}
      saveAction={async ({ id, probability, impact }) => {
        const response = await api.patch(`/v1/risks/${id}`, {
          likelihood: probability,
          impact,
        });
        if (response.error) {
          throw new Error('Failed to update inherent risk');
        }
        globalMutate(
          (key) => Array.isArray(key) && key[0]?.includes('/v1/risks'),
          undefined,
          { revalidate: true },
        );
        return response;
      }}
    />
  );
}
