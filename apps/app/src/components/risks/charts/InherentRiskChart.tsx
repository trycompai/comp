"use client";

import { InherentRiskSheet } from "@/components/sheets/InherentRiskSheet";
import { useI18n } from "@/locales/client";
import type { Risk } from "@comp/db/types";
import { RiskMatrixChart } from "./RiskMatrixChart";

interface InherentRiskChartProps {
	risk: Risk;
}

export function InherentRiskChart({ risk }: InherentRiskChartProps) {
	const t = useI18n();

	return (
		<RiskMatrixChart
			title={t("risk.metrics.inherentRisk")}
			description={t("risk.dashboard.inherent_risk_description")}
			activeLikelihood={risk.likelihood}
			activeImpact={risk.impact}
			sheetQueryParam="inherent-risk-sheet"
			EditSheetComponent={InherentRiskSheet}
			editSheetProps={{
				riskId: risk.id,
				initialProbability: risk.likelihood,
				initialImpact: risk.impact,
			}}
		/>
	);
}
