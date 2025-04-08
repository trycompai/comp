"use client";

import { useI18n } from "@/locales/client";
import type { Vendor } from "@comp/db/types";
import { VendorInherentRiskSheet } from "./VendorInherentRiskSheet";
import { RiskMatrixChart } from "@/components/risks/charts/RiskMatrixChart";

interface InherentRiskChartProps {
	vendor: Vendor;
}

export function VendorInherentRiskChart({ vendor }: InherentRiskChartProps) {
	const t = useI18n();

	return (
		<RiskMatrixChart
			title={t("vendors.risks.inherent_risk")}
			description={t("vendors.risks.update_inherent_risk_description")}
			activeLikelihood={vendor.inherentProbability}
			activeImpact={vendor.inherentImpact}
			sheetQueryParam="inherent-risk-sheet"
			EditSheetComponent={VendorInherentRiskSheet}
			editSheetProps={{
				vendorId: vendor.id,
				initialProbability: vendor.inherentProbability,
				initialImpact: vendor.inherentImpact,
			}}
		/>
	);
}
