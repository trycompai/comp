"use client";

import * as React from "react";
import { Pie, PieChart, Label, Tooltip, ResponsiveContainer } from "recharts";

import {
	Card,
	CardContent,
	CardHeader,
	CardFooter,
	CardTitle,
} from "@comp/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@comp/ui/chart";
import { useI18n } from "@/locales/client";
import { Badge } from "@comp/ui/badge";
import {
	PieChart as PieChartIcon,
	BarChart as ChartIcon,
	Info,
} from "lucide-react";

interface PolicyOverviewData {
	totalPolicies: number;
	publishedPolicies: number;
	draftPolicies: number;
	archivedPolicies: number;
	needsReviewPolicies: number;
}

interface PolicyStatusChartProps {
	data?: PolicyOverviewData | null;
}

const CHART_COLORS = {
	published: "hsl(var(--chart-positive))", // green
	draft: "hsl(var(--chart-neutral))", // yellow
	archived: "hsl(var(--chart-warning))", // gray
	needs_review: "hsl(var(--chart-destructive))", // red
};

// Custom tooltip component for the pie chart
const StatusTooltip = ({ active, payload }: any) => {
	if (active && payload && payload.length) {
		const data = payload[0].payload;
		return (
			<div className="rounded-md border bg-background p-2 shadow-md">
				<p className="text-xs font-medium">{data.name}</p>
				<p className="text-xs">
					Count: <span className="font-medium">{data.value}</span>
				</p>
			</div>
		);
	}
	return null;
};

export function PolicyStatusChart({ data }: PolicyStatusChartProps) {
	const t = useI18n();

	if (!data) {
		return (
			<Card className="flex flex-col border overflow-hidden">
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							{t("policies.dashboard.policy_status") || "Policy Status"}
						</CardTitle>
						<Badge variant="outline" className="text-xs">
							Overview
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="flex-1 flex items-center justify-center py-10">
					<div className="text-center space-y-2">
						<div className="flex justify-center text-muted-foreground">
							<Info className="h-10 w-10 opacity-30" />
						</div>
						<p className="text-center text-sm text-muted-foreground">
							No policy data available
						</p>
					</div>
				</CardContent>
				<CardFooter className="bg-muted/30 border-t py-3">
					<div className="flex flex-wrap gap-4 py-1 justify-center w-full" />
				</CardFooter>
			</Card>
		);
	}

	const chartData = React.useMemo(() => {
		const items = [
			{
				name: t("policies.status.published"),
				value: data.publishedPolicies,
				fill: CHART_COLORS.published,
			},
			{
				name: t("policies.status.draft"),
				value: data.draftPolicies,
				fill: CHART_COLORS.draft,
			},
			{
				name: t("policies.status.archived"),
				value: data.archivedPolicies,
				fill: CHART_COLORS.archived,
			},
			{
				name: t("policies.status.needs_review"),
				value: data.needsReviewPolicies,
				fill: CHART_COLORS.needs_review,
			},
		];

		return items.filter((item) => item.value);
	}, [data, t]);

	const chartConfig = {
		value: {
			label: "Count",
		},
	} satisfies ChartConfig;

	// Calculate most common status
	const mostCommonStatus = React.useMemo(() => {
		if (!chartData.length) return null;
		return chartData.reduce((prev, current) =>
			prev.value > current.value ? prev : current,
		);
	}, [chartData]);

	return (
		<Card className="flex flex-col border overflow-hidden">
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						{t("policies.dashboard.policy_status") || "Policy Status"}
					</CardTitle>

					{data.totalPolicies > 0 && mostCommonStatus && (
						<Badge
							className="text-xs"
							style={{
								backgroundColor: `${mostCommonStatus.fill}20`,
								color: mostCommonStatus.fill,
							}}
						>
							Most: {mostCommonStatus.name}
						</Badge>
					)}
				</div>

				<div className="relative h-1 w-full bg-secondary/50 rounded-full overflow-hidden mt-2">
					<div
						className="h-full bg-primary/80 transition-all"
						style={{
							width: `${(data.publishedPolicies / Math.max(data.totalPolicies, 1)) * 100}%`,
						}}
					/>
				</div>
			</CardHeader>
			<CardContent className="flex-1 flex items-center justify-center">
				<ChartContainer
					config={chartConfig}
					className="mx-auto h-[300px] max-w-[250px]"
				>
					<PieChart
						width={250}
						height={300}
						margin={{
							top: 16,
							right: 16,
							bottom: 16,
							left: 16,
						}}
					>
						<ChartTooltip cursor={false} content={<ChartTooltipContent />} />
						<Pie
							data={chartData}
							dataKey="value"
							nameKey="name"
							innerRadius={60}
							outerRadius={80}
							paddingAngle={2}
							strokeWidth={3}
							stroke="hsl(var(--background))"
							cursor="pointer"
							animationDuration={500}
							animationBegin={100}
						>
							<Label
								content={({ viewBox }) => {
									if (viewBox && "cx" in viewBox && "cy" in viewBox) {
										return (
											<g>
												<text
													x={viewBox.cx}
													y={viewBox.cy}
													textAnchor="middle"
													dominantBaseline="middle"
												>
													<tspan
														x={viewBox.cx}
														y={viewBox.cy}
														className="fill-foreground text-3xl font-bold"
													>
														{data.totalPolicies}
													</tspan>
													<tspan
														x={viewBox.cx}
														y={(viewBox.cy || 0) + 26}
														className="fill-muted-foreground text-xs"
													>
														Policies
													</tspan>
												</text>
												<circle
													cx={viewBox.cx}
													cy={viewBox.cy}
													r={54}
													fill="none"
													stroke="hsl(var(--border))"
													strokeWidth={1}
													strokeDasharray="2,2"
												/>
											</g>
										);
									}
									return null;
								}}
							/>
						</Pie>
					</PieChart>
				</ChartContainer>
			</CardContent>
			<CardFooter className="bg-muted/30 border-t py-3">
				<div className="flex flex-wrap gap-4 justify-center w-full py-1">
					{chartData.map((entry) => (
						<div key={entry.name} className="flex items-center gap-2">
							<div
								className="h-3 w-3"
								style={{ backgroundColor: entry.fill }}
							/>
							<span className="text-xs font-medium whitespace-nowrap">
								{entry.name}
								<span className="ml-1 text-muted-foreground">
									({entry.value})
								</span>
							</span>
						</div>
					))}
				</div>
			</CardFooter>
		</Card>
	);
}
