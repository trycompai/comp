"use client";

import { useI18n } from "@/locales/client";
import type { Vendor } from "@comp/db/types";
import { Impact, Likelihood } from "@prisma/client";
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
import { ResidualRiskSheet } from "./residual-risk";

interface ResidualRiskChartProps {
	vendor: Vendor;
}

// Map enum values to numeric scores (1-5)
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

// Risk level colors
const RISK_COLORS = {
	low: "#22c55e", // green
	medium: "#f59e0b", // amber
	high: "#f97316", // orange
	critical: "#ef4444", // red
};

export function ResidualRiskVendorChart({ vendor }: ResidualRiskChartProps) {
	const t = useI18n();
	const [open, setOpen] = useQueryState("residual-risk-sheet");

	// Calculate risk score from probability and impact
	const riskScore =
		LIKELIHOOD_SCORES[vendor.residualProbability] *
		IMPACT_SCORES[vendor.residualImpact];

	// Determine risk level
	let riskLevel = "low";
	if (riskScore > 16) riskLevel = "critical";
	else if (riskScore > 9) riskLevel = "high";
	else if (riskScore > 4) riskLevel = "medium";

	// Get color based on risk level
	const riskColor = RISK_COLORS[riskLevel as keyof typeof RISK_COLORS];

	// Get translated risk level using known safe keys
	let riskLevelText: string;
	switch (riskLevel) {
		case "low":
			riskLevelText = t("vendors.risks.low");
			break;
		case "medium":
			riskLevelText = t("vendors.risks.medium");
			break;
		case "high":
			riskLevelText = t("vendors.risks.high");
			break;
		case "critical":
			riskLevelText = "Critical";
			break;
		default:
			riskLevelText = "Unknown";
	}

	// Generate the 5x5 matrix
	const matrix = [] as {
		x: number;
		y: number;
		color: string;
		isActive: boolean;
	}[];

	for (let impactScore = 5; impactScore >= 1; impactScore--) {
		for (let likelihoodScore = 1; likelihoodScore <= 5; likelihoodScore++) {
			const cellScore = likelihoodScore * impactScore;
			let cellColor = RISK_COLORS.low;

			if (cellScore > 16) cellColor = RISK_COLORS.critical;
			else if (cellScore > 9) cellColor = RISK_COLORS.high;
			else if (cellScore > 4) cellColor = RISK_COLORS.medium;

			matrix.push({
				x: likelihoodScore,
				y: impactScore,
				color: cellColor,
				isActive:
					likelihoodScore === LIKELIHOOD_SCORES[vendor.residualProbability] &&
					impactScore === IMPACT_SCORES[vendor.residualImpact],
			});
		}
	}

	const yAxisLabels = [
		"V.Likely",
		"Likely",
		"Possible",
		"Unlikely",
		"V.Unlikely",
	];
	const xAxisLabels = ["Insig", "Minor", "Mod", "Major", "Severe"];

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex justify-between items-center">
						<div>
							<CardTitle>
								<div className="flex items-center justify-between gap-2">
									{t("vendors.risks.residual_risk")}
									<Button
										onClick={() => setOpen("true")}
										size="icon"
										variant="ghost"
										className="p-0 m-0 size-auto"
									>
										<PencilIcon className="h-3 w-3" />
									</Button>
								</div>
							</CardTitle>
							<CardDescription className="text-xs">
								{t("vendors.risks.update_residual_risk_description")}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="mb-8">
						{/* 5x5 Risk Matrix */}
						<div className="relative w-full aspect-[1.5/1] max-h-[300px]">
							{/* Y-axis label */}
							<div className="absolute left-[-30px] top-1/2 -translate-y-1/2 -rotate-90 font-semibold text-sm text-muted-foreground z-10">
								Probability
							</div>

							{/* Main grid container */}
							<div className="absolute top-0 left-[90px] right-[10px] bottom-[35px]">
								<div className="relative w-full h-full border-l border-b">
									{/* Grid rows */}
									{[...Array(5)].map((_, rowIndex) => (
										<div
											key={`row-${rowIndex}`}
											className="h-[20%] flex border-t"
										>
											{/* Grid cells for this row */}
											{[...Array(5)].map((_, colIndex) => {
												// Find the corresponding cell in our matrix data
												const cell = matrix.find(
													(m) => m.x === colIndex + 1 && m.y === 5 - rowIndex,
												);

												return (
													<div
														key={`cell-${rowIndex}-${colIndex}`}
														className="w-[20%] border-r relative"
														style={{ backgroundColor: `${cell?.color}25` }}
													>
														{cell?.isActive && (
															<div className="absolute inset-0 flex items-center justify-center">
																<div
																	className="w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-white"
																	style={{ backgroundColor: cell.color }}
																/>
															</div>
														)}
													</div>
												);
											})}
										</div>
									))}

									{/* Y-axis labels - positioned outside the grid */}
									{yAxisLabels.map((label, i) => (
										<div
											key={`y-label-${i}`}
											className="absolute text-sm text-right"
											style={{
												left: "-75px",
												top: `${i * 20 + 10}%`,
												transform: "translateY(-50%)",
												width: "65px",
											}}
										>
											{label}
										</div>
									))}

									{/* X-axis labels */}
									{xAxisLabels.map((label, i) => (
										<div
											key={`x-label-${i}`}
											className="absolute text-sm text-center"
											style={{
												left: `${i * 20 + 10}%`,
												bottom: "-25px",
												transform: "translateX(-50%)",
												width: "40px",
											}}
										>
											{label}
										</div>
									))}

									{/* X-axis title */}
									<div
										className="absolute font-semibold text-sm text-muted-foreground"
										style={{
											bottom: "-45px",
											left: "50%",
											transform: "translateX(-50%)",
										}}
									>
										Impact
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Risk level display */}
					<div className="text-center mt-8">
						<span className="text-2xl font-bold" style={{ color: riskColor }}>
							{riskLevelText}
						</span>
						<span className="text-muted-foreground ml-2">({riskScore}/25)</span>
					</div>
				</CardContent>
			</Card>
			<ResidualRiskSheet vendorId={vendor.id} initialRisk={vendor} />
		</>
	);
}
