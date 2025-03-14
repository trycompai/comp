"use client";

import React from "react";
import { useEvidenceDashboard } from "../hooks/useEvidenceDashboard";
import { DepartmentBarChart } from "./DepartmentChart/DepartmentBarChart";
import { AssigneeBarChart } from "./AssigneeChart/AssigneeBarChart";
import { FrameworkBarChart } from "./FrameworkChart/FrameworkBarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { useI18n } from "@/locales/client";
import {
	EvidenceOverviewSkeleton,
	EvidenceErrorState,
	EvidenceEmptyState,
} from "./EvidenceUIStates";
import { EvidenceSummaryCards } from "../../list/components/EvidenceSummaryCards";

export const EvidenceOverview = () => {
	const { data, isLoading, error } = useEvidenceDashboard();
	const t = useI18n();

	if (isLoading) {
		return <EvidenceOverviewSkeleton />;
	}

	if (error) {
		return <EvidenceErrorState message={error.message} />;
	}

	if (!data) {
		return <EvidenceEmptyState />;
	}

	return (
		<div className="space-y-8">
			{/* Evidence summary statistics cards */}
			<EvidenceSummaryCards />

			{/* Charts */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
				<Card>
					<CardHeader>
						<CardTitle>{t("evidence.dashboard.by_department")}</CardTitle>
					</CardHeader>
					<CardContent>
						<DepartmentBarChart byDepartment={data.byDepartment} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{t("evidence.dashboard.by_assignee")}</CardTitle>
					</CardHeader>
					<CardContent>
						<AssigneeBarChart
							byAssignee={data.byAssignee}
							unassigned={data.unassigned}
						/>
					</CardContent>
				</Card>

				<Card className="md:col-span-2">
					<CardHeader>
						<CardTitle>{t("evidence.dashboard.by_framework")}</CardTitle>
					</CardHeader>
					<CardContent>
						<FrameworkBarChart byFramework={data.byFramework} />
					</CardContent>
				</Card>
			</div>
		</div>
	);
};
