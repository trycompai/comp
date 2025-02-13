"use client";

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
  framework: Framework & {
    categories: {
      controls: Control[];
    }[];
  };
  organizationFramework: OrganizationFramework & {
    organizationControl: OrganizationControl[];
  };
}

export function FrameworkOverview({
  framework,
  organizationFramework,
}: FrameworkOverviewProps) {
  const totalControls = framework.categories.reduce(
    (acc, cat) => acc + cat.controls.length,
    0,
  );

  const compliantControls = organizationFramework.organizationControl.filter(
    (oc) => oc.status === "compliant",
  ).length;

  const compliancePercentage = Math.round(
    (compliantControls / totalControls) * 100,
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>{framework.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {framework.description}
          </p>
          <div className="mt-4">
            <Badge variant="outline">Version {framework.version}</Badge>
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
                {organizationFramework.lastAssessed
                  ? format(organizationFramework.lastAssessed, "MMM d, yyyy")
                  : "Never"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Next assessment:{" "}
                {organizationFramework.nextAssessment
                  ? format(organizationFramework.nextAssessment, "MMM d, yyyy")
                  : "Not scheduled"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
