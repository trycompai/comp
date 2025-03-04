"use client";

import { useI18n } from "@/locales/client";
import type { Risk, User } from "@bubba/db";
import { Alert, AlertDescription, AlertTitle } from "@bubba/ui/alert";
import { Button } from "@bubba/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { Icons } from "@bubba/ui/icons";
import { PencilIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import { UpdateRiskOverview } from "../forms/risks/risk-overview";
import { RiskOverviewSheet } from "../sheets/risk-overview-sheet";

export function RiskOverview({
  risk,
  users,
}: {
  risk: Risk & { owner: User | null };
  users: User[];
}) {
  const t = useI18n();
  const [open, setOpen] = useQueryState("risk-overview-sheet");

  return (
    <div className="space-y-4">
      <Alert>
        <Icons.Risk className="h-4 w-4" />
        <AlertTitle>
          <div className="flex items-center justify-between gap-2">
            {risk.title}
            <Button
              size="icon"
              variant="ghost"
              className="p-0 m-0 size-auto"
              onClick={() => setOpen("true")}
            >
              <PencilIcon className="h-3 w-3" />
            </Button>
          </div>
        </AlertTitle>
        <AlertDescription className="mt-4">{risk.description}</AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center justify-between gap-2">
              {t("risk.dashboard.overview")}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UpdateRiskOverview risk={risk} users={users} />
        </CardContent>
      </Card>

      <RiskOverviewSheet risk={risk} />
    </div>
  );
}
