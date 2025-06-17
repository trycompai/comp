'use client';

import type { Risk } from '@comp/db/types';
import { RiskMatrixChart } from './RiskMatrixChart';
import { updateInherentRiskAction } from '@/actions/risk/update-inherent-risk-action';

interface InherentRiskChartProps {
  risk: Risk;
}

export function InherentRiskChart({ risk }: InherentRiskChartProps) {
  return (
    <RiskMatrixChart
      title={'Inherent Risk'}
      description={'Initial risk level before any controls are applied'}
      riskId={risk.id}
      activeLikelihood={risk.likelihood}
      activeImpact={risk.impact}
      saveAction={async ({ id, probability, impact }) => {
        return updateInherentRiskAction({ id, probability, impact });
      }}
    />
  );
}
