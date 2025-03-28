import { getI18n } from "@/locales/server";
import { db } from "@bubba/db";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import type { CSSProperties } from "react";

interface Props {
	organizationId: string;
}

interface UserTestStats {
	user: {
		id: string;
		name: string | null;
		image: string | null;
	};
	totalTests: number;
	passedTests: number;
	failedTests: number;
	unsupportedTests: number;
}

interface TestData {
	status: string;
	assignedUserId: string | null;
}

interface UserData {
	id: string;
	name: string | null;
	image: string | null;
	OrganizationIntegrationResults: TestData[];
}

const testStatus = {
	passed: "bg-[var(--chart-closed)]",
	failed: "bg-[hsl(var(--destructive))]",
	unsupported: "bg-[hsl(var(--muted-foreground))]",
};

export async function TestsByAssignee({ organizationId }: Props) {
	const t = await getI18n();
	const userStats = await userData(organizationId);
	console.log(userStats);
	const stats: UserTestStats[] = userStats.map((user) => ({
		user: {
			id: user.id,
			name: user.name,
			image: user.image,
		},
		totalTests: user.OrganizationIntegrationResults.length,
		passedTests: user.OrganizationIntegrationResults.filter(
			(test) => test.status.toUpperCase() === "passed".toUpperCase(),
		).length,
		failedTests: user.OrganizationIntegrationResults.filter(
			(test) => test.status.toUpperCase() === "failed".toUpperCase(),
		).length,
		unsupportedTests: user.OrganizationIntegrationResults.filter(
			(test) => test.status.toUpperCase() === "unsupported".toUpperCase(),
		).length,
	}));

	stats.sort((a, b) => b.totalTests - a.totalTests);

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("tests.dashboard.tests_by_assignee")}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-8">
					{stats.map((stat) => (
						<div key={stat.user.id} className="space-y-2">
							<div className="flex justify-between items-center">
								<p className="text-sm">{stat.user.name || "Unknown User"}</p>
								<span className="text-sm text-muted-foreground">
									{stat.totalTests} Tests
								</span>
							</div>

							<TestBarChart stat={stat} />

							<div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
								<div className="flex items-center gap-1">
									<div className="size-2 bg-[var(--chart-success)]" />
									<span>
										{t("tests.dashboard.passed")} ({stat.passedTests})
									</span>
								</div>
								<div className="flex items-center gap-1">
									<div className="size-2 bg-[hsl(var(--destructive))]" />
									<span>
										{t("tests.dashboard.failed")} ({stat.failedTests})
									</span>
								</div>
								<div className="flex items-center gap-1">
									<div className="size-2 bg-[hsl(var(--muted-foreground))]" />
									<span>Unsupported ({stat.unsupportedTests})</span>
								</div>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function TestBarChart({ stat }: { stat: UserTestStats }) {
	const data = [
		...(stat.passedTests > 0
			? [
					{
						key: "passed",
						value: stat.passedTests,
						color: testStatus.passed,
						label: "passed",
					},
				]
			: []),
		...(stat.failedTests > 0
			? [
					{
						key: "failed",
						value: stat.failedTests,
						color: testStatus.failed,
						label: "failed",
					},
				]
			: []),
		...(stat.unsupportedTests > 0
			? [
					{
						key: "unsupported",
						value: stat.unsupportedTests,
						color: testStatus.unsupported,
						label: "unsupported",
					},
				]
			: []),
	];

	const gap = 0.3;
	const totalValue = stat.totalTests;
	const barHeight = 12;
	const totalWidth = totalValue + gap * (data.length - 1);
	let cumulativeWidth = 0;
	const cornerRadius = 0;

	if (totalValue === 0) {
		return <div className="h-3 bg-muted" />;
	}

	return (
		<div
			className="relative h-[var(--height)]"
			style={
				{
					"--marginTop": "0px",
					"--marginRight": "0px",
					"--marginBottom": "0px",
					"--marginLeft": "0px",
					"--height": `${barHeight}px`,
				} as CSSProperties
			}
		>
			<div
				className="absolute inset-0
          h-[calc(100%-var(--marginTop)-var(--marginBottom))]
          w-[calc(100%-var(--marginLeft)-var(--marginRight))]
          translate-x-[var(--marginLeft)]
          translate-y-[var(--marginTop)]
          overflow-visible
        "
			>
				{data.map((d) => {
					const barWidth = (d.value / totalWidth) * 100;
					const xPosition = cumulativeWidth;
					cumulativeWidth += barWidth + gap;

					return (
						<div
							key={d.key}
							className="relative"
							style={{
								width: `${barWidth}%`,
								height: `${barHeight}px`,
								left: `${xPosition}%`,
								position: "absolute",
							}}
						>
							<div
								className={`bg-gradient-to-b ${d.color}`}
								style={{
									width: "100%",
									height: "100%",
									borderRadius: `${cornerRadius}px`,
								}}
								title={`${d.label}: ${d.value}`}
							/>
						</div>
					);
				})}
			</div>
		</div>
	);
}

const userData = async (organizationId: string): Promise<UserData[]> => {
	// Fetch users in the organization with their assigned test results
	const users = await db.user.findMany({
		where: {
			organizationId,
		},
		select: {
			id: true,
			name: true,
			image: true,
			OrganizationIntegrationResults: {
				select: {
					status: true,
				},
				where: {
					organizationId,
					NOT: {
						assignedUserId: null,
					},
				},
			},
		},
	});

	console.log(users);

	return users as UserData[];
};
