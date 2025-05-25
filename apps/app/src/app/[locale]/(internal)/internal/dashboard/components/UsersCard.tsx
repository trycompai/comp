"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@comp/ui/card";
import { Progress } from "@comp/ui/progress";
import { Skeleton } from "@comp/ui/skeleton";
import { Calendar, Clock, TrendingDown, TrendingUp, Users } from "lucide-react";
import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useUsersAnalytics } from "../hooks/useUsersAnalytics";
import { parseUTCDate } from "@/utils/format";

// Helper function for formatting numbers
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

export function UsersCard() {
	const {
		data: usersData,
		isLoading: isUsersLoading,
		isError: isUsersError,
	} = useUsersAnalytics();

	// Calculate chart data from the API data - use last 30 days daily data
	const chartData = useMemo(() => {
		if (!usersData?.last30DaysByDay) {
			return [];
		}
		// Ensure data is sorted chronologically
                return [...usersData.last30DaysByDay]
                        .sort(
                                (a, b) =>
                                        parseUTCDate(a.date).getTime() - parseUTCDate(b.date).getTime(),
                        )
                        .map((item) => ({
                                date: item.date,
                                value: item.count,
                        }));
	}, [usersData?.last30DaysByDay]);

	// Calculate active percentage using all-time data
	const usersActivePercent = useMemo(() => {
		if (
			usersData?.activeSessionTotal != null &&
			usersData?.allTimeTotal != null &&
			usersData.allTimeTotal > 0
		) {
			return (
				(usersData.activeSessionTotal / usersData.allTimeTotal) *
				100
			).toFixed(1);
		}
		return "0.0";
	}, [usersData?.activeSessionTotal, usersData?.allTimeTotal]);

	// Format growth percentage from API data
	const growthPercentFormatted = useMemo(() => {
		return formatPercentage(usersData?.percentageChangeLast30Days);
	}, [usersData?.percentageChangeLast30Days]);

	const growthColor = useMemo(() => {
		if (usersData?.percentageChangeLast30Days == null)
			return "text-muted-foreground";
		return usersData.percentageChangeLast30Days >= 0
			? "text-green-500"
			: "text-destructive";
	}, [usersData?.percentageChangeLast30Days]);

	if (isUsersError) {
		return (
			<Card className="overflow-hidden rounded-sm">
				<CardHeader className="pb-2 flex flex-row items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="p-1.5 bg-emerald-500/10 rounded-sm">
							<Users className="h-5 w-5 text-emerald-500" />
						</div>
						<CardTitle className="text-lg">Users</CardTitle>
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
					<div className="p-1.5 bg-emerald-500/10 rounded-sm">
						<Users className="h-5 w-5 text-emerald-500" />
					</div>
					<CardTitle className="text-lg">Users</CardTitle>
				</div>
				<div
					className={`flex items-center text-xs ${growthColor} font-medium`}
				>
					{usersData?.percentageChangeLast30Days == null ||
					usersData.percentageChangeLast30Days >= 0 ? (
						<TrendingUp className="h-3.5 w-3.5 mr-1" />
					) : (
						<TrendingDown className="h-3.5 w-3.5 mr-1" />
					)}
					{isUsersLoading ? (
						<Skeleton className="h-3 w-10" />
					) : (
						growthPercentFormatted
					)}
				</div>
			</CardHeader>
			<CardContent>
				{isUsersLoading ? (
					<div className="space-y-4 mt-2">
						<Skeleton className="h-10 w-full" />{" "}
						{/* Chart Placeholder */}
						{/* Last 30 days Placeholder */}
						<div className="bg-muted p-3 space-y-2 rounded-sm">
							<Skeleton className="h-4 w-1/3" />
							<Skeleton className="h-4 w-full" />
						</div>
						{/* All Time Placeholder */}
						<div className="space-y-3">
							<Skeleton className="h-4 w-1/4 mb-1" />
							<Skeleton className="h-6 w-full mb-2" />
							<Skeleton className="h-4 w-full mb-1" />
							<Skeleton className="h-1.5 w-full mb-1" />
							<Skeleton className="h-3 w-1/2" />
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
												id="usersGradient"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor="hsl(var(--chart-positive))"
													stopOpacity={0.3}
												/>
												<stop
													offset="95%"
													stopColor="hsl(var(--chart-positive))"
													stopOpacity={0}
												/>
											</linearGradient>
										</defs>
										<Area
											type="linear"
											dataKey="value"
											stroke="hsl(var(--chart-positive))"
											strokeWidth={2}
											fill="url(#usersGradient)"
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
									{formatNumber(usersData?.last30DaysTotal)}
								</span>
							</div>
							{/* Removed 'Active' from last 30 days as API provides all-time active */}
							{/* <div className="flex justify-between mb-1">
								<span className="text-gray-400 text-sm">Active</span>
								<span className="text-sm font-medium">{formatNumber(usersData?.activeSessionTotal)}</span> // Incorrect context
							</div> */}
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
										{formatNumber(
											usersData?.allTimeTotal,
										) ?? "N/A"}
									</span>
								</div>
							</div>

							<div>
								<div className="flex justify-between mb-1">
									<span className="text-muted-foreground text-sm">
										Active
									</span>
									<span className="text-sm font-medium">
										{formatNumber(
											usersData?.activeSessionTotal,
										) ?? "N/A"}
									</span>
								</div>
								<Progress
									value={Number.parseFloat(
										usersActivePercent,
									)}
									className="h-1.5 bg-muted rounded-sm [&>div]:bg-emerald-500"
								/>
								<div className="text-xs text-muted-foreground mt-1">
									{usersActivePercent}% of total
								</div>
							</div>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
