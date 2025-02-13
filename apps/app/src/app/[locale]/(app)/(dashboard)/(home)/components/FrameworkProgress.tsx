"use client";

import { useI18n } from "@/locales/client";
import type {
  Framework,
  OrganizationControl,
  OrganizationFramework,
} from "@bubba/db";
import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { Progress } from "@bubba/ui/progress";
import { FileStack } from "lucide-react";
import Link from "next/link";
import { Button } from "@bubba/ui/button";

interface Props {
  frameworks: (OrganizationFramework & {
    organizationControl: OrganizationControl[];
    framework: Framework;
  })[];
}

export function FrameworkProgress({ frameworks }: Props) {
  const t = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("frameworks.overview.progress.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {frameworks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileStack className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">
              {t("frameworks.overview.progress.empty.title")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("frameworks.overview.progress.empty.description")}
            </p>
            <Button asChild className="mt-4">
              <Link href="/frameworks">
                {t("frameworks.overview.progress.empty.action")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {frameworks.map((framework) => {
              const total = framework.organizationControl.length;
              const completed = framework.organizationControl.filter(
                (control) => control.status === "compliant"
              ).length;
              const progress = total ? (completed / total) * 100 : 0;

              return (
                <Link
                  key={framework.id}
                  href={`/frameworks/${framework.framework.id}`}
                  className="block space-y-3 rounded-lg p-4 hover:bg-muted transition-colors duration-200"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {framework.framework.name}
                    </span>
                    <span className="font-medium text-muted-foreground">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <Progress value={progress} />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
