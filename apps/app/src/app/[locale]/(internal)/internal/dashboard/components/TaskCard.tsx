"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@comp/ui/card";
import { Progress } from "@comp/ui/progress";
import { Skeleton } from "@comp/ui/skeleton";
import { Calendar, Clock, FileText, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useTaskAnalytics } from "../hooks/useTaskAnalytics";
import { parseUTCDate } from "@/utils/format";

// Helper function for formatting numbers (assuming it exists or can be added)
function formatNumber(value: number | null | undefined): string {
	if (value == null) return "N/A";
	return value.toLocaleString();
}

// Helper function for formatting percentages
function formatPercentage(value: number | null | undefined): string {
	if (value == null) return "N/A";
	const sign = value >= 0 ? "+" : "";
	return `${sign}${value.toFixed(1)}%`;
}

const chartStrokeColor = "#9333ea"; // purple-600
const chartFillColor = "#9333ea"; // purple-600

export function TaskCard() {
	const {
		data: taskData,
		isLoading: isTaskLoading,
		isError: isTaskError,
	} = useTaskAnalytics();

	// Calculate chart data from the API data - use last 30 days daily data
	const chartData = useMemo(() => {
		if (!taskData?.last30DaysTotalByDay) {
			return [];
		}
		// Ensure data is sorted chronologically if not already guaranteed by API
                return [...taskData.last30DaysTotalByDay]
                        .sort(
                                (a, b) =>
                                        parseUTCDate(a.date).getTime() - parseUTCDate(b.date).getTime(),
                        )
                        .map((item) => ({
                                date: item.date,
                                value: item.count,
                        }));
	}, [taskData?.last30DaysTotalByDay]);

	// Calculate published percentage using all-time data
	const taskDonePercent = useMemo(() => {
		if (
			taskData?.allTimeDone != null &&
			taskData?.allTimeTotal != null &&
			taskData.allTimeTotal > 0
		) {
			return (
				(taskData.allTimeDone / taskData.allTimeTotal) *
				100
			).toFixed(1);
		}
		return "0.0";
	}, [taskData?.allTimeDone, taskData?.allTimeTotal]);

	// Format growth percentage from API data
	const growthPercentFormatted = useMemo(() => {
		return formatPercentage(taskData?.percentageChangeLast30Days);
	}, [taskData?.percentageChangeLast30Days]);

	const growthColor = useMemo(() => {
		if (taskData?.percentageChangeLast30Days == null)
			return "text-muted-foreground";
		return taskData.percentageChangeLast30Days >= 0
			? "text-green-500"
			: "text-destructive";
	}, [taskData?.percentageChangeLast30Days]);

	if (isTaskError) {
		return (
			<Card className="overflow-hidden rounded-sm">
				<CardHeader className="pb-2 flex flex-row items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="p-1.5 bg-purple-500/10 rounded-sm">
							<FileText className="h-5 w-5 text-purple-500" />
						</div>
						<CardTitle className="text-lg">Task</CardTitle>
					</div>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-destructive">
						Error loading data.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="overflow-hidden rounded-sm">
			<CardHeader className="pb-2 flex flex-row items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="p-1.5 bg-purple-500/10 rounded-sm">
						<FileText className="h-5 w-5 text-purple-500" />
					</div>
					<CardTitle className="text-lg">Task</CardTitle>
				</div>
				<div
					className={`flex items-center text-xs ${growthColor} font-medium`}
				>
					<TrendingUp className="h-3.5 w-3.5 mr-1" />
					{isTaskLoading ? (
						<Skeleton className="h-3 w-10" />
					) : (
						growthPercentFormatted
					)}
				</div>
			</CardHeader>
			<CardContent>
				{isTaskLoading ? (
					<div className="space-y-4 mt-2">
						<Skeleton className="h-10 w-full" />{" "}
						{/* Chart Placeholder */}
						{/* Last 30 days Placeholder */}
						<div className="bg-muted p-3 space-y-2 rounded-sm">
							<Skeleton className="h-4 w-1/3" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-full" />
						</div>
						{/* All Time Placeholder */}
						<div className="space-y-3">
							<Skeleton className="h-4 w-1/4 mb-1" />
							<Skeleton className="h-6 w-full mb-2" />
							<Skeleton className="h-4 w-full mb-1" />
							<Skeleton className="h-1.5 w-full mb-1" />
							<Skeleton className="h-3 w-1/2 mb-2" />
							<Skeleton className="h-4 w-full" />
						</div>
					</div>
				) : (
					<>
						<div className="mt-1 mb-4">
							<div className="h-[40px] w-full">
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart
										data={chartData}
										margin={{
											top: 0,
											right: 0,
											left: 0,
											bottom: 0,
										}}
									>
										<defs>
											<linearGradient
												id="taskGradient"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor={chartFillColor}
													stopOpacity={0.3}
												/>
												<stop
													offset="95%"
													stopColor={chartFillColor}
													stopOpacity={0}
												/>
											</linearGradient>
										</defs>
										<Area
											type="linear"
											dataKey="value"
											stroke={chartStrokeColor}
											strokeWidth={2}
											fill="url(#taskGradient)"
											isAnimationActive={false}
										/>
									</AreaChart>
								</ResponsiveContainer>
							</div>
						</div>

						{/* Last 30 Days Section */}
						<div className="bg-muted p-3 mb-4 rounded-sm">
							<div className="flex items-center gap-2 mb-2">
								<Clock className="h-4 w-4 text-muted-foreground" />
								<span className="text-sm font-medium text-foreground">
									Last 30 Days
								</span>
							</div>
							<div className="flex justify-between mb-1">
								<span className="text-muted-foreground text-sm">
									New
								</span>
								<span className="text-sm font-medium">
									{formatNumber(taskData?.last30DaysTotal)}
								</span>
							</div>
						</div>

						{/* All Time Section */}
						<div className="bg-muted p-3 mb-4 rounded-sm">
							<div className="flex items-center gap-2 mb-2">
								<Calendar className="h-4 w-4 text-muted-foreground" />
								<span className="text-sm font-medium text-foreground">
									All Time
								</span>
							</div>
							<div>
								<div className="flex justify-between mb-1">
									<span className="text-muted-foreground text-sm">
										Total
									</span>
									<span className="text-xl font-bold">
										{formatNumber(taskData?.allTimeTotal) ??
											"N/A"}
									</span>
								</div>
							</div>

							<div>
								<div className="flex justify-between mb-1">
									<span className="text-muted-foreground text-sm">
										Done
									</span>
									<span className="text-sm font-medium">
										{formatNumber(
											taskData?.allTimeDone,
										) ?? "N/A"}
									</span>
								</div>
								<Progress
									value={Number.parseFloat(
										taskDonePercent,
									)}
									className="h-1.5 bg-muted rounded-sm [&>div]:bg-purple-500"
								/>
								<div className="text-xs text-muted-foreground mt-1">
									{taskDonePercent}% of total
								</div>
							</div>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
