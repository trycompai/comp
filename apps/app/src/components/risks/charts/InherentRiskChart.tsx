'use client';

import { useApi } from '@/hooks/use-api';
import type { Risk } from '@db';
import { RiskMatrixChart } from './RiskMatrixChart';

interface InherentRiskChartProps {
  risk: Risk;
}

export function InherentRiskChart({ risk }: InherentRiskChartProps) {
  const api = useApi();

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
        return response;
      }}
    />
  );
}
