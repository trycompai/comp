"use client";

import { DisplayFrameworkStatus } from "@/components/frameworks/framework-status";
import { useOrganizationControl } from "../hooks/useOrganizationControl";
import { Card } from "@bubba/ui/card";
import { Label } from "@bubba/ui/label";
import { Button } from "@bubba/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOrganizationControlProgress } from "../hooks/useOrganizationControlProgress";
import { DataTable } from "./data-table/data-table";
import { useMemo } from "react";

interface SingleControlProps {
  controlId: string;
}

export const SingleControl = ({ controlId }: SingleControlProps) => {
  const router = useRouter();
  const { data: control } = useOrganizationControl(controlId);
  const { data: controlProgress } = useOrganizationControlProgress(controlId);

  const progressStatus = useMemo(() => {
    if (!controlProgress) return "not_started";

    return controlProgress.progress?.completed > 0
      ? "in_progress"
      : controlProgress.progress?.completed === 0
        ? "not_started"
        : "completed";
  }, [controlProgress]);

  if (!control || !controlProgress) return null;

  return (
    <div className="max-w-[1200px] mx-auto py-8 gap-8 flex flex-col">
      <div>
        <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
          <ArrowLeft size={16} />
          <p>Back</p>
        </Button>
      </div>
      <div className="flex flex-row justify-between items-center">
        <h1 className="text-3xl font-bold">{control?.control.name}</h1>
        <DisplayFrameworkStatus status={progressStatus} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-col gap-2 p-4 px-8 min-h-[200px]">
          <div>
            <Label className="text-lg">Description</Label>
            <p className="text-sm">{control?.control.description}</p>
          </div>
        </Card>
        <Card className="gap-2 p-4 px-8 grid grid-cols-2">
          <div>
            <Label className="text-lg">Code</Label>
            <h1 className="text-sm">{control?.control.code}</h1>
          </div>
          <div>
            <Label className="text-lg">Domain</Label>
            <p className="text-sm">{control?.control.domain}</p>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Requirements</h1>
        {control.OrganizationControlRequirement && (
          <DataTable data={control.OrganizationControlRequirement} />
        )}
      </div>
    </div>
  );
};
