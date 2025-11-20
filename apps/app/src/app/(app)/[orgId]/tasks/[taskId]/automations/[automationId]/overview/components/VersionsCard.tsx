"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { History, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { EvidenceAutomationVersion } from "@trycompai/db";
import { Button } from "@trycompai/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@trycompai/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@trycompai/ui/dialog";

import { restoreVersion } from "../../../../automation/[automationId]/actions/task-automation-actions";
import { useAutomationVersions } from "../../../../automation/[automationId]/hooks/use-automation-versions";

export function VersionsCard() {
  const { orgId, taskId, automationId } = useParams<{
    orgId: string;
    taskId: string;
    automationId: string;
  }>();
  const { versions, isLoading, mutate } = useAutomationVersions();
  const [restoring, setRestoring] = useState<number | null>(null);
  const [confirmRestore, setConfirmRestore] =
    useState<EvidenceAutomationVersion | null>(null);

  const handleRestore = async (version: EvidenceAutomationVersion) => {
    setRestoring(version.version);

    try {
      const result = await restoreVersion(
        orgId,
        taskId,
        automationId,
        version.version,
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to restore version");
      }

      toast.success(`Draft overwritten with version ${version.version}`);
      setConfirmRestore(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to restore version",
      );
    } finally {
      setRestoring(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <History className="text-primary h-4 w-4" />
            Published Versions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Loading versions...</p>
        </CardContent>
      </Card>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <History className="text-primary h-4 w-4" />
            Published Versions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-4 text-center text-sm">
            No published versions yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <History className="text-primary h-4 w-4" />
            Published Versions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {versions.map((version) => {
            const timeAgo = formatDistanceToNow(new Date(version.createdAt), {
              addSuffix: true,
            });
            const isRestoring = restoring === version.version;

            return (
              <div
                key={version.id}
                className="border-border bg-muted/20 hover:bg-muted/30 flex items-start gap-3 rounded-xs border p-3 transition-all"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Version {version.version}
                    </span>
                    <span className="text-muted-foreground text-xs">•</span>
                    <span className="text-muted-foreground text-xs">
                      {timeAgo}
                    </span>
                  </div>
                  {version.changelog && (
                    <p className="text-muted-foreground text-xs">
                      {version.changelog}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRestore(version)}
                  disabled={isRestoring}
                >
                  <RotateCcw className="h-4 w-4" />
                  {isRestoring ? "Restoring..." : "Restore"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Confirm Restore Dialog */}
      <Dialog
        open={!!confirmRestore}
        onOpenChange={(open) => !open && setConfirmRestore(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Overwrite Draft with Version {confirmRestore?.version}?
            </DialogTitle>
            <DialogDescription>
              This will replace your current draft with the script from version{" "}
              {confirmRestore?.version}. Your current draft will be lost. Chat
              history will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRestore(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => confirmRestore && handleRestore(confirmRestore)}
              variant="destructive"
            >
              Overwrite Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
