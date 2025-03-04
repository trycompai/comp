"use client";

import React from "react";
import { useEvidenceDashboard } from "../hooks/useEvidenceDashboard";
import { DepartmentBarChart } from "./DepartmentBarChart";
import { AssigneeBarChart } from "./AssigneeBarChart";
import { FrameworkBarChart } from "./FrameworkBarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { useI18n } from "@/locales/client";

export const EvidenceOverview = () => {
  const { data, isLoading, error } = useEvidenceDashboard();
  const t = useI18n();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!data) {
    return <div>No data available</div>;
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold">
        {t("evidence.dashboard.title")}
      </h2>

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
