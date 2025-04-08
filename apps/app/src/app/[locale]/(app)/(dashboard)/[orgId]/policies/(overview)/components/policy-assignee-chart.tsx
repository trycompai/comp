"use client";

import * as React from "react";

import {
	Card,
	CardContent,
	CardHeader,
	CardFooter,
	CardTitle,
} from "@comp/ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@comp/ui/chart";
import { useI18n } from "@/locales/client";
import { Badge } from "@comp/ui/badge";
import { BarChart as BarChartIcon, Users, Info } from "lucide-react";
import {
	Bar,
	BarChart,
	XAxis,
	YAxis,
	Legend,
	ResponsiveContainer,
	LabelList,
} from "recharts";

interface AssigneeData {
	id: string;
	name: string;
	total: number;
	published: number;
	draft: number;
	archived: number;
	needs_review: number;
}

interface PolicyAssigneeChartProps {
	data?: AssigneeData[] | null;
}

const CHART_COLORS = {
	published: "hsl(var(--chart-positive))", // green
	draft: "hsl(var(--chart-neutral))", // yellow
	archived: "hsl(var(--chart-warning))", // gray
	needs_review: "hsl(var(--chart-destructive))", // red
};

export function PolicyAssigneeChart({ data }: PolicyAssigneeChartProps) {
	const t = useI18n();

	if (!data || data.length === 0) {
		return (
			<Card className="flex flex-col border overflow-hidden">
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							{t("policies.dashboard.policies_by_assignee") ||
								"Policies by Assignee"}
						</CardTitle>

						<Badge variant="outline" className="text-xs">
							Distribution
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="flex-1 flex items-center justify-center py-10">
					<div className="text-center space-y-2">
						<div className="flex justify-center text-muted-foreground">
							<Users className="h-10 w-10 opacity-30" />
						</div>
						<p className="text-center text-sm text-muted-foreground">
							No policies assigned to users
						</p>
					</div>
				</CardContent>
				<CardFooter className="bg-muted/30 border-t py-3">
					<div className="flex flex-wrap gap-4 py-1 justify-center w-full" />
				</CardFooter>
			</Card>
		);
	}

	// Sort assignees by total policies (descending)
	const sortedData = React.useMemo(() => {
		return [...data]
			.sort((a, b) => b.total - a.total)
			.slice(0, 4)
			.reverse();
	}, [data]);

	const chartData = sortedData.map((item) => ({
		name: item.name,
		published: item.published,
		draft: item.draft,
		archived: item.archived,
		needs_review: item.needs_review,
	}));

	const chartConfig = {
		published: {
			label: t("policies.status.published"),
			color: CHART_COLORS.published,
		},
		draft: {
			label: t("policies.status.draft"),
			color: CHART_COLORS.draft,
		},
		archived: {
			label: t("policies.status.archived"),
			color: CHART_COLORS.archived,
		},
		needs_review: {
			label: t("policies.status.needs_review"),
			color: CHART_COLORS.needs_review,
		},
	} satisfies ChartConfig;

	// Calculate total policies and top assignee
	const totalPolicies = React.useMemo(() => {
		if (!data.length) return 0;
		return data.reduce((sum, item) => sum + item.total, 0);
	}, [data]);

	const topAssignee = React.useMemo(() => {
		if (!data.length) return null;
		return data.reduce((prev, current) =>
			prev.total > current.total ? prev : current,
		);
	}, [data]);

	return (
		<Card className="flex flex-col border overflow-hidden">
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						{t("policies.dashboard.policies_by_assignee") ||
							"Policies by Assignee"}
					</CardTitle>
					{topAssignee && (
						<Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
							Top: {topAssignee.name}
						</Badge>
					)}
				</div>

				<div className="relative h-1 w-full bg-secondary/50 rounded-full overflow-hidden mt-2">
					<div
						className="h-full bg-primary/80 transition-all"
						style={{
							width: `${totalPolicies > 0 ? 100 : 0}%`,
							opacity: 0.7,
						}}
					/>
				</div>
			</CardHeader>
			<CardContent className="flex-1">
				<div className="flex flex-col h-full">
					<div className="flex justify-between items-center mb-1 text-xs text-muted-foreground px-1">
						<span>Assignee</span>
						<span>Policy Count</span>
					</div>
					<ChartContainer config={chartConfig}>
						<ResponsiveContainer width="100%" height={250}>
							<BarChart
								accessibilityLayer
								data={chartData}
								layout="vertical"
								barSize={24}
								barGap={4}
								margin={{
									top: 0,
									right: 0,
									bottom: 0,
									left: 0,
								}}
							>
								<XAxis type="number" hide />
								<YAxis
									dataKey="name"
									type="category"
									tickLine={false}
									tickMargin={10}
									axisLine={false}
									tickFormatter={(value) => value.split(" ")[0]}
									fontSize={12}
									stroke="hsl(var(--muted-foreground))"
								/>
								<ChartTooltip
									cursor={false}
									content={<ChartTooltipContent />}
								/>
								<Bar
									dataKey="published"
									stackId="a"
									fill={CHART_COLORS.published}
									radius={[0, 2, 2, 0]}
									animationDuration={800}
									animationBegin={100}
								/>
								<Bar
									dataKey="draft"
									stackId="a"
									fill={CHART_COLORS.draft}
									radius={[0, 0, 0, 0]}
									animationDuration={800}
									animationBegin={200}
								/>
								<Bar
									dataKey="archived"
									stackId="a"
									fill={CHART_COLORS.archived}
									radius={[0, 0, 0, 0]}
									animationDuration={800}
									animationBegin={300}
								/>
								<Bar
									dataKey="needs_review"
									stackId="a"
									fill={CHART_COLORS.needs_review}
									radius={[0, 0, 0, 0]}
									animationDuration={800}
									animationBegin={400}
								/>
							</BarChart>
						</ResponsiveContainer>
					</ChartContainer>
				</div>
			</CardContent>
			<CardFooter className="bg-muted/30 border-t py-3">
				<div className="flex flex-wrap gap-4 justify-center w-full py-1">
					{Object.entries(chartConfig).map(([key, config]) => (
						<div key={key} className="flex items-center gap-2">
							<div
								className="h-3 w-3"
								style={{ backgroundColor: config.color }}
							/>
							<span className="text-xs font-medium">{config.label}</span>
						</div>
					))}
				</div>
			</CardFooter>
		</Card>
	);
}
