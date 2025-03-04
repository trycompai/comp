"use client";

import { useOrganizationCategories } from "@/app/[locale]/(app)/(dashboard)/frameworks/[frameworkId]/hooks/useOrganizationCategories";
import { useOrganizationFramework } from "@/app/[locale]/(app)/(dashboard)/frameworks/[frameworkId]/hooks/useOrganizationFramework";
import type {
  Control,
  Framework,
  OrganizationControl,
  OrganizationFramework,
} from "@bubba/db";
import { Badge } from "@bubba/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { Progress } from "@bubba/ui/progress";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

interface FrameworkOverviewProps {
  frameworkId: string;
}

export function FrameworkOverview({ frameworkId }: FrameworkOverviewProps) {
  const { data } = useOrganizationCategories(frameworkId);
  const { data: framework } = useOrganizationFramework(frameworkId);

  console.log({ data });

  // Calculate compliance metrics
  const totalControls = data?.reduce(
    (acc, cat) => acc + cat.organizationControl.length,
    0,
  );

  const compliantControls = data?.reduce(
    (acc, cat) =>
      acc +
      cat.organizationControl.filter((oc) => oc.status === "compliant").length,
    0,
  );

  const compliancePercentage = Math.round(
    (compliantControls ?? 0 / (totalControls ?? 0)) * 100,
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>{framework?.framework.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {framework?.framework.description}
          </p>
          <div className="mt-4">
            <Badge variant="outline">
              Version {framework?.framework.version}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compliance Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Progress value={compliancePercentage} />
            <p className="text-sm text-muted-foreground">
              {compliantControls} of {totalControls} controls compliant
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assessment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Last assessed:{" "}
                {framework?.lastAssessed
                  ? format(framework?.lastAssessed, "MMM d, yyyy")
                  : "Never"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Next assessment:{" "}
                {framework?.nextAssessment
                  ? format(framework?.nextAssessment, "MMM d, yyyy")
                  : "Not scheduled"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
