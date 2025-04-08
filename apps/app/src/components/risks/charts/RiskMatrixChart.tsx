"use client";

import { useI18n } from "@/locales/client";
import { Impact, Likelihood } from "@comp/db/types";
import { Button } from "@comp/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@comp/ui/card";
import { PencilIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import type React from "react";

// --- Constants (Copied from vendor chart) ---

const LIKELIHOOD_SCORES: Record<Likelihood, number> = {
	very_unlikely: 1,
	unlikely: 2,
	possible: 3,
	likely: 4,
	very_likely: 5,
};

const IMPACT_SCORES: Record<Impact, number> = {
	insignificant: 1,
	minor: 2,
	moderate: 3,
	major: 4,
	severe: 5,
};

const RISK_COLORS = {
	low: "#22c55e", // green
	medium: "#f59e0b", // amber
	high: "#f97316", // orange
	critical: "#ef4444", // red
};

const VISUAL_LIKELIHOOD_ORDER: Likelihood[] = [
	Likelihood.very_likely,
	Likelihood.likely,
	Likelihood.possible,
	Likelihood.unlikely,
	Likelihood.very_unlikely,
];
const VISUAL_IMPACT_ORDER: Impact[] = [
	Impact.insignificant,
	Impact.minor,
	Impact.moderate,
	Impact.major,
	Impact.severe,
];

const Y_AXIS_LABELS = [
	"Very Likely",
	"Likely",
	"Possible",
	"Unlikely",
	"Very Unlikely",
];
const X_AXIS_LABELS = ["Insignificant", "Minor", "Moderate", "Major", "Severe"];

// --- Component Props ---

interface RiskMatrixChartProps {
	title: string;
	description: string;
	activeLikelihood: Likelihood;
	activeImpact: Impact;
	sheetQueryParam: string;
	EditSheetComponent: React.ComponentType<any>; // Accept any sheet component
	editSheetProps: Record<string, any>; // Pass props dynamically
}

// --- Reusable Chart Component ---

export function RiskMatrixChart({
	title,
	description,
	activeLikelihood,
	activeImpact,
	sheetQueryParam,
	EditSheetComponent,
	editSheetProps,
}: RiskMatrixChartProps) {
	const t = useI18n();
	const [open, setOpen] = useQueryState(sheetQueryParam);

	// Calculate risk score (using active values from props)
	const riskScore =
		LIKELIHOOD_SCORES[activeLikelihood] * IMPACT_SCORES[activeImpact];

	// Determine risk level
	let riskLevel = "low";
	if (riskScore > 16) riskLevel = "critical";
	else if (riskScore > 9) riskLevel = "high";
	else if (riskScore > 4) riskLevel = "medium";

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex justify-between items-center">
						<div className="w-full">
							<CardTitle>
								<div className="flex items-center justify-between gap-2">
									{title}
									<Button
										onClick={() => setOpen("true")}
										size="icon"
										variant="ghost"
										className="p-0 m-0 size-auto"
									>
										<PencilIcon className="h-4 w-4" />
									</Button>
								</div>
							</CardTitle>
							<CardDescription className="text-xs">
								{description}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div
						className="grid w-full max-h-[350px] aspect-[1.5/1] gap-1
                       grid-cols-1 grid-rows-1
                       lg:grid-cols-[auto_auto_1fr] lg:grid-rows-[1fr_auto_auto]"
					>
						{/* Y-axis Title */}
						<div className="hidden lg:grid place-items-center lg:row-start-1 lg:col-start-1">
							<span className="-rotate-90 font-semibold text-sm text-muted-foreground whitespace-nowrap">
								{t("risk.metrics.probability")}
							</span>
						</div>

						{/* Y-axis Labels */}
						<div className="hidden lg:grid grid-rows-5 lg:row-start-1 lg:col-start-2 pr-2">
							{Y_AXIS_LABELS.map((label, i) => (
								<div
									key={`y-label-${i}`}
									className="grid place-items-center justify-end text-sm"
								>
									{label}
								</div>
							))}
						</div>

						{/* 5x5 Matrix Grid */}
						<div className="grid grid-cols-5 grid-rows-5 border-l border-b row-start-1 col-start-1 lg:col-start-3 lg:row-start-1">
							{VISUAL_LIKELIHOOD_ORDER.map((rowLikelihood, rowIndex) =>
								VISUAL_IMPACT_ORDER.map((colImpact, colIndex) => {
									const likelihoodScore = LIKELIHOOD_SCORES[rowLikelihood];
									const impactScore = IMPACT_SCORES[colImpact];
									const cellScore = likelihoodScore * impactScore;

									let cellColor = RISK_COLORS.low;
									if (cellScore > 16) cellColor = RISK_COLORS.critical;
									else if (cellScore > 9) cellColor = RISK_COLORS.high;
									else if (cellScore > 4) cellColor = RISK_COLORS.medium;

									const isActive =
										rowLikelihood === activeLikelihood &&
										colImpact === activeImpact;

									return (
										<div
											key={`cell-${rowIndex}-${colIndex}`}
											className="border-t border-r relative"
											style={{ backgroundColor: `${cellColor}25` }} // Cell background based on risk level
										>
											{isActive && (
												<div
													className="absolute inset-0 z-10 border" // Highlight active cell
													style={{
														backgroundColor: cellColor,
														borderColor: cellColor,
														opacity: 0.9,
													}}
												/>
											)}
										</div>
									);
								}),
							)}
						</div>

						{/* X-axis Labels */}
						<div className="hidden lg:grid grid-cols-5 lg:col-start-3 lg:row-start-2 pt-1">
							{X_AXIS_LABELS.map((label, i) => (
								<div
									key={`x-label-${i}`}
									className="grid place-items-center text-sm"
								>
									{label}
								</div>
							))}
						</div>

						{/* X-axis Title */}
						<div className="hidden lg:grid place-items-center lg:col-start-3 lg:row-start-3 pt-1">
							<span className="font-semibold text-sm text-muted-foreground">
								{t("risk.metrics.impact")}
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
			{/* Render the passed Edit Sheet component with its specific props */}
			<EditSheetComponent {...editSheetProps} />
		</>
	);
}
