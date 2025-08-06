'use client';

import { updateResidualRiskEnumAction } from '@/actions/risk/update-residual-risk-enum-action';
import type { Risk } from '@db';
import { useGT } from 'gt-next';
import { RiskMatrixChart } from './RiskMatrixChart';

interface ResidualRiskChartProps {
  risk: Risk;
}

export function ResidualRiskChart({ risk }: ResidualRiskChartProps) {
  const t = useGT();
  return (
    <RiskMatrixChart
      title={t('Residual Risk')}
      description={t('Remaining risk level after controls are applied')}
      riskId={risk.id}
      activeLikelihood={risk.residualLikelihood}
      activeImpact={risk.residualImpact}
      saveAction={async ({ id, probability, impact }) => {
        return updateResidualRiskEnumAction({ id, probability, impact });
      }}
    />
  );
}
