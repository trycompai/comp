"use client";

import { PieChart } from "@/components/ui/pie-chart";
import { useI18n } from "@/locales/client";
import type {
  Framework,
  OrganizationControl,
  OrganizationFramework,
} from "@bubba/db";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { cn } from "@bubba/ui/cn";

interface Props {
  frameworks: (OrganizationFramework & {
    framework: Framework;
    organizationControl: OrganizationControl[];
  })[];
}

export function RequirementStatus({ frameworks }: Props) {
  const t = useI18n();

  const allRequirements = frameworks.flatMap((f) => f.organizationControl);

  const statusCounts = {
    non_compliant: allRequirements.filter((r) => r.status === "not_started")
      .length,
    in_progress: allRequirements.filter((r) => r.status === "in_progress")
      .length,
    compliant: allRequirements.filter((r) => r.status === "compliant").length,
  };

  const data = [
    {
      name: t("common.status.non_compliant"),
      value: statusCounts.non_compliant,
      color: "hsl(var(--destructive))",
      colorClass: "bg-[hsl(var(--destructive))]",
    },
    {
      name: t("common.status.in_progress"),
      value: statusCounts.in_progress,
      color: "hsl(var(--warning))",
      colorClass: "bg-[hsl(var(--warning))]",
    },
    {
      name: t("common.status.compliant"),
      value: statusCounts.compliant,
      color: "hsl(var(--success))",
      colorClass: "bg-[hsl(var(--success))]",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("overview.requirement_chart.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <PieChart data={data} />
        <div className="mt-4 2xl:grid 2xl:grid-cols-3 gap-4 text-sm">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className={cn("h-3 w-3", item.colorClass)} />
              <span>{item.name}</span>
              <span className="ml-auto font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
