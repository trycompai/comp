'use client';

import { useApi } from '@/hooks/use-api';
import type { Risk } from '@db';
import { RiskMatrixChart } from './RiskMatrixChart';

interface ResidualRiskChartProps {
  risk: Risk;
}

export function ResidualRiskChart({ risk }: ResidualRiskChartProps) {
  const api = useApi();

  return (
    <RiskMatrixChart
      title={'Residual Risk'}
      description={'Remaining risk level after controls are applied'}
      riskId={risk.id}
      activeLikelihood={risk.residualLikelihood}
      activeImpact={risk.residualImpact}
      saveAction={async ({ id, probability, impact }) => {
        const response = await api.patch(`/v1/risks/${id}`, {
          residualLikelihood: probability,
          residualImpact: impact,
        });
        if (response.error) {
          throw new Error('Failed to update residual risk');
        }
        return response;
      }}
    />
  );
}
