"use client";

import { useState } from "react";
import Image from "next/image";
import { PlusIcon } from "lucide-react";

import type { FrameworkEditorFramework } from "@trycompai/db";
import { Button } from "@trycompai/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@trycompai/ui/card";
import { Dialog } from "@trycompai/ui/dialog";
import { ScrollArea } from "@trycompai/ui/scroll-area";

import type { FrameworkInstanceWithControls } from "../types";
import type { FrameworkInstanceWithComplianceScore } from "./types";
import { AddFrameworkModal } from "./AddFrameworkModal";

export interface FrameworksOverviewProps {
  frameworksWithControls: FrameworkInstanceWithControls[];
  allFrameworks: FrameworkEditorFramework[];
  frameworksWithCompliance?: FrameworkInstanceWithComplianceScore[];
  organizationId?: string;
}

export function mapFrameworkToBadge(framework: FrameworkInstanceWithControls) {
  if (framework.framework.name === "SOC 2") {
    return "/badges/soc2.svg";
  }

  if (framework.framework.name === "ISO 27001") {
    return "/badges/iso27001.svg";
  }

  if (framework.framework.name === "ISO 42001") {
    return "/badges/iso42001.svg";
  }

  if (framework.framework.name === "HIPAA") {
    return "/badges/hipaa.svg";
  }

  if (framework.framework.name === "GDPR") {
    return "/badges/gdpr.svg";
  }

  if (framework.framework.name === "PCI DSS") {
    return "/badges/pci-dss.svg";
  }

  if (framework.framework.name === "NEN 7510") {
    return "/badges/nen7510.svg";
  }

  return null;
}

export function FrameworksOverview({
  frameworksWithControls,
  frameworksWithCompliance,
  allFrameworks,
  organizationId,
}: FrameworksOverviewProps) {
  const [isAddFrameworkModalOpen, setIsAddFrameworkModalOpen] = useState(false);

  // Create a map of framework IDs to compliance scores for easy lookup
  const complianceMap = new Map(
    frameworksWithCompliance?.map((f) => [
      f.frameworkInstance.id,
      f.complianceScore,
    ]) ?? [],
  );

  // Calculate overall compliance score from all frameworks
  const overallComplianceScore =
    frameworksWithCompliance && frameworksWithCompliance.length > 0
      ? frameworksWithCompliance.reduce(
          (sum, f) => sum + f.complianceScore,
          0,
        ) / frameworksWithCompliance.length
      : 0;

  // Get available frameworks that can be added (not already in the organization)
  const availableFrameworksToAdd = allFrameworks.filter(
    (framework) =>
      !frameworksWithControls.some((fc) => fc.framework.id === framework.id),
  );

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {"Frameworks"}
          </CardTitle>
        </div>

        <div className="bg-secondary/50 relative mt-2 h-1 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all"
            style={{
              width: `${overallComplianceScore}%`,
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col">
        <div className="h-[300px]">
          <ScrollArea className="h-full">
            <div className="space-y-0 pr-4">
              {frameworksWithControls.map((framework, index) => {
                const complianceScore = complianceMap.get(framework.id) ?? 0;
                const badgeSrc = mapFrameworkToBadge(framework);

                return (
                  <div key={framework.id}>
                    <div className="flex items-start justify-between px-1 py-4">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="mt-1 flex-shrink-0">
                          {badgeSrc ? (
                            <Image
                              src={badgeSrc}
                              alt={framework.framework.name}
                              width={400}
                              height={400}
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                              <span className="text-muted-foreground text-xs">
                                {framework.framework.name.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="text-foreground flex flex-col text-sm font-medium">
                            {framework.framework.name}
                            <span className="text-muted-foreground text-xs font-normal">
                              {framework.framework.description?.trim()}
                            </span>
                          </span>

                          <div className="mt-1.5 flex flex-col">
                            <div className="bg-muted/50 h-1 w-full rounded-full">
                              <div
                                className="bg-primary h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${complianceScore}%`,
                                }}
                              />
                            </div>
                            <span className="text-muted-foreground mt-1 text-right text-xs tabular-nums">
                              {Math.round(complianceScore)}% compliant
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < frameworksWithControls.length - 1 && (
                      <div className="border-muted/30 border-t" />
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </CardContent>

      <CardFooter className="mt-auto">
        <div className="flex w-full justify-center">
          <Button
            variant="outline"
            onClick={() => setIsAddFrameworkModalOpen(true)}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Framework
          </Button>
        </div>
      </CardFooter>

      <Dialog
        open={isAddFrameworkModalOpen}
        onOpenChange={setIsAddFrameworkModalOpen}
      >
        {isAddFrameworkModalOpen && (
          <AddFrameworkModal
            onOpenChange={setIsAddFrameworkModalOpen}
            availableFrameworks={availableFrameworksToAdd}
            organizationId={organizationId}
          />
        )}
      </Dialog>
    </Card>
  );
}
