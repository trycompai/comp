'use client';

import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { EvidenceAutomationVersion } from '@db';
import { formatDistanceToNow } from 'date-fns';
import { History, RotateCcw } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { restoreVersion } from '../../../../automation/[automationId]/actions/task-automation-actions';
import { useAutomationVersions } from '../../../../automation/[automationId]/hooks/use-automation-versions';

export function VersionsCard() {
  const { orgId, taskId, automationId } = useParams<{
    orgId: string;
    taskId: string;
    automationId: string;
  }>();
  const { versions, isLoading, mutate } = useAutomationVersions();
  const [restoring, setRestoring] = useState<number | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<EvidenceAutomationVersion | null>(null);

  const handleRestore = async (version: EvidenceAutomationVersion) => {
    setRestoring(version.version);

    try {
      const result = await restoreVersion(orgId, taskId, automationId, version.version);

      if (!result.success) {
        throw new Error(result.error || 'Failed to restore version');
      }

      toast.success(`Draft overwritten with version ${version.version}`);
      setConfirmRestore(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to restore version');
    } finally {
      setRestoring(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Published Versions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading versions...</p>
        </CardContent>
      </Card>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Published Versions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
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
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Published Versions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {versions.map((version) => {
            const timeAgo = formatDistanceToNow(new Date(version.createdAt), { addSuffix: true });
            const isRestoring = restoring === version.version;

            return (
              <div
                key={version.id}
                className="flex items-start gap-3 p-3 rounded-xs border border-border bg-muted/20 hover:bg-muted/30 transition-all"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Version {version.version}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{timeAgo}</span>
                  </div>
                  {version.changelog && (
                    <p className="text-xs text-muted-foreground">{version.changelog}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRestore(version)}
                  disabled={isRestoring}
                >
                  <RotateCcw className="h-4 w-4" />
                  {isRestoring ? 'Restoring...' : 'Restore'}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Confirm Restore Dialog */}
      <Dialog open={!!confirmRestore} onOpenChange={(open) => !open && setConfirmRestore(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Overwrite Draft with Version {confirmRestore?.version}?</DialogTitle>
            <DialogDescription>
              This will replace your current draft with the script from version{' '}
              {confirmRestore?.version}. Your current draft will be lost. Chat history will be
              preserved.
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
