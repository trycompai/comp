"use client";

import type { Risk } from "@comp/db/types";
import { RiskMatrixChart } from "./RiskMatrixChart";
import { updateResidualRiskEnumAction } from "@/actions/risk/update-residual-risk-enum-action";

interface ResidualRiskChartProps {
  risk: Risk;
}

export function ResidualRiskChart({ risk }: ResidualRiskChartProps) {
  return (
    <RiskMatrixChart
      title={"Residual Risk"}
      description={"Remaining risk level after controls are applied"}
      riskId={risk.id}
      activeLikelihood={risk.residualLikelihood}
      activeImpact={risk.residualImpact}
      saveAction={async ({ id, probability, impact }) => {
        return updateResidualRiskEnumAction({ id, probability, impact });
      }}
    />
  );
}
