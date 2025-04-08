"use client";

import { useI18n } from "@/locales/client";
import type { Vendor } from "@comp/db/types";
import { VendorResidualRiskSheet } from "./VendorResidualRiskSheet";
import { RiskMatrixChart } from "@/components/risks/charts/RiskMatrixChart";

interface ResidualRiskChartProps {
	vendor: Vendor;
}

export function VendorResidualRiskChart({ vendor }: ResidualRiskChartProps) {
	const t = useI18n();

	return (
		<RiskMatrixChart
			title={t("vendors.risks.residual_risk")}
			description={t("vendors.risks.update_residual_risk_description")}
			activeLikelihood={vendor.residualProbability}
			activeImpact={vendor.residualImpact}
			sheetQueryParam="residual-risk-sheet"
			EditSheetComponent={VendorResidualRiskSheet}
			editSheetProps={{
				vendorId: vendor.id,
				initialRisk: vendor,
			}}
		/>
	);
}
