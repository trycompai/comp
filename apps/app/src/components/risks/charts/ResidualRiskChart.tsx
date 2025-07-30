'use client';

import { updateResidualRiskEnumAction } from '@/actions/risk/update-residual-risk-enum-action';
import type { Risk } from '@db';
import { RiskMatrixChart } from './RiskMatrixChart';

interface ResidualRiskChartProps {
  risk: Risk;
}

export function ResidualRiskChart({ risk }: ResidualRiskChartProps) {
  return (
    <RiskMatrixChart
      title={'Residual Risk'}
      description={'Remaining risk level after controls are applied'}
      riskId={risk.id}
      activeLikelihood={risk.residualLikelihood}
      activeImpact={risk.residualImpact}
      saveAction={async ({ id, probability, impact }) => {
        return updateResidualRiskEnumAction({ id, probability, impact });
      }}
    />
  );
}
