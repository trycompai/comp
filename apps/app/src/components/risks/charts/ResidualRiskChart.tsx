"use client";

import { ResidualRiskSheet } from "@/components/sheets/ResidualRiskSheet";
import { useI18n } from "@/locales/client";
import type { Risk } from "@comp/db/types";
import { RiskMatrixChart } from "./RiskMatrixChart";

interface ResidualRiskChartProps {
	risk: Risk;
}

export function ResidualRiskChart({ risk }: ResidualRiskChartProps) {
	const t = useI18n();

	return (
		<RiskMatrixChart
			title={t("risk.metrics.residualRisk")}
			description={t("risk.dashboard.residual_risk_description")}
			activeLikelihood={risk.residualLikelihood}
			activeImpact={risk.residualImpact}
			sheetQueryParam="residual-risk-sheet"
			EditSheetComponent={ResidualRiskSheet}
			editSheetProps={{
				riskId: risk.id,
				initialProbability: risk.residualLikelihood,
				initialImpact: risk.residualImpact,
			}}
		/>
	);
}
