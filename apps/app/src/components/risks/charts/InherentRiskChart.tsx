'use client';

import { updateInherentRiskAction } from '@/actions/risk/update-inherent-risk-action';
import type { Risk } from '@db';
import { useGT } from 'gt-next';
import { RiskMatrixChart } from './RiskMatrixChart';

interface InherentRiskChartProps {
  risk: Risk;
}

export function InherentRiskChart({ risk }: InherentRiskChartProps) {
  const t = useGT();
  return (
    <RiskMatrixChart
      title={t('Inherent Risk')}
      description={t('Initial risk level before any controls are applied')}
      riskId={risk.id}
      activeLikelihood={risk.likelihood}
      activeImpact={risk.impact}
      saveAction={async ({ id, probability, impact }) => {
        return updateInherentRiskAction({ id, probability, impact });
      }}
    />
  );
}
