"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { Clock, Code2 } from "lucide-react";
import { toast } from "sonner";

import {
  EvidenceAutomationRun,
  EvidenceAutomationVersion,
} from "@trycompai/db";
import { Button } from "@trycompai/ui/button";
import { Card, CardContent } from "@trycompai/ui/card";
import { Input } from "@trycompai/ui/input";
import { Switch } from "@trycompai/ui/switch";

import { useTaskAutomation } from "../../../../automation/[automationId]/hooks/use-task-automation";

interface MetricsSectionProps {
  automationName: string;
  initialVersions: EvidenceAutomationVersion[];
  initialRuns: EvidenceAutomationRun[];
  isEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  isTogglingEnabled: boolean;
  editScriptUrl: string;
}

export function MetricsSection({
  automationName,
  initialVersions,
  initialRuns,
  isEnabled,
  onToggleEnabled,
  isTogglingEnabled,
  editScriptUrl,
}: MetricsSectionProps) {
  const { orgId, taskId, automationId } = useParams<{
    orgId: string;
    taskId: string;
    automationId: string;
  }>();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { mutate: mutateAutomation } = useTaskAutomation();

  // Get latest published version runs only
  const latestVersionNumber =
    initialVersions.length > 0 ? initialVersions[0].version : null;

  const latestVersionRuns = useMemo(() => {
    if (!latestVersionNumber) {
      return initialRuns;
    }
    return initialRuns.filter((run) => run.version === latestVersionNumber);
  }, [latestVersionNumber, initialRuns]);

  // Calculate metrics from latest version runs
  const totalRuns = latestVersionRuns.length;
  const successfulRuns = latestVersionRuns.filter(
    (run) => run.status === "completed",
  ).length;
  const successRate =
    totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;
  const latestRun = latestVersionRuns[0];

  const handleNameEdit = () => {
    setNameValue(automationName);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const saveNameEdit = async () => {
    if (!nameValue.trim() || nameValue === automationName) {
      setEditingName(false);
      return;
    }

    try {
      const response = await api.patch(
        `/v1/tasks/${taskId}/automations/${automationId}`,
        { name: nameValue.trim() },
        orgId,
      );

      if (response.error) {
        throw new Error(response.error);
      }

      await mutateAutomation();
      toast.success("Name updated");
      setEditingName(false);
    } catch (error) {
      toast.error("Failed to update name");
      setNameValue(automationName);
      setEditingName(false);
    }
  };

  return (
    <div className="bg-secondary flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        {editingName ? (
          <Input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={saveNameEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                saveNameEdit();
              } else if (e.key === "Escape") {
                setEditingName(false);
              }
            }}
            className="max-w-md text-xl font-medium"
          />
        ) : (
          <div
            onClick={handleNameEdit}
            className="group/title hover:bg-background/80 hover:border-border -mx-2 -my-1 inline-flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xl font-medium transition-all hover:border"
          >
            <span>{automationName}</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">
              {isEnabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={isEnabled}
              onCheckedChange={onToggleEnabled}
              disabled={isTogglingEnabled}
              className="scale-90"
            />
            <Link href={editScriptUrl}>
              <Button size="sm">
                <Code2 className="mr-2 h-4 w-4" />
                Edit Script
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="min-h-[120px] p-6">
            <p className="text-muted-foreground mb-2 text-sm">Success Rate</p>
            <div className="flex items-baseline gap-2">
              <p className="text-chart-positive text-3xl font-semibold">
                {successRate}%
              </p>
              <p className="text-muted-foreground text-sm">Avg.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="min-h-[120px] p-6">
            <p className="text-muted-foreground mb-2 text-sm">Schedule</p>
            <div className="flex items-center gap-2 text-base font-medium">
              <Clock className="h-4 w-4" />
              Every Day 9:00 AM
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="min-h-[120px] p-6">
            <p className="text-muted-foreground mb-2 text-sm">Next Run</p>
            <p className="text-base font-medium">Tomorrow 9:00 AM</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="min-h-[120px] p-6">
            <p className="text-muted-foreground mb-2 text-sm">Last Run</p>
            {latestRun ? (
              <>
                <p className="text-base font-medium">
                  {new Date(latestRun.createdAt).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`text-xs font-medium ${
                      latestRun.status === "completed"
                        ? "text-chart-positive"
                        : "text-chart-destructive"
                    }`}
                  >
                    {latestRun.status === "completed" ? "Complete" : "Failed"}
                  </span>
                  <span className="text-muted-foreground text-xs">• 2s</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-base">No runs yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {latestVersionNumber && (
        <span className="text-muted-foreground w-fit text-xs">
          Metrics shown for version {latestVersionNumber}
        </span>
      )}
    </div>
  );
}
