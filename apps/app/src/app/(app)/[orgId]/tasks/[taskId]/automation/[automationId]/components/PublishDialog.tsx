'use client';

import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Label } from '@comp/ui/label';
import { Textarea } from '@comp/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { executeAutomationScript, publishAutomation } from '../actions/task-automation-actions';
import { useAutomationVersions } from '../hooks/use-automation-versions';
import { useSharedChatContext } from '../lib/chat-context';

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishDialog({ open, onOpenChange }: PublishDialogProps) {
  const router = useRouter();
  const { orgId, taskId } = useParams<{
    orgId: string;
    taskId: string;
    automationId: string;
  }>();
  const { automationIdRef } = useSharedChatContext();
  const [changelog, setChangelog] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPostPublishOptions, setShowPostPublishOptions] = useState(false);
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);
  const { mutate } = useAutomationVersions();

  const handleDialogChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    // Reset state when dialog closes
    if (!newOpen) {
      setChangelog('');
      setShowPostPublishOptions(false);
      setPublishedVersion(null);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);

    try {
      const result = await publishAutomation(
        orgId,
        taskId,
        automationIdRef.current,
        changelog || undefined,
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to publish');
      }

      const versionNumber = result.version?.version;
      toast.success(`Version ${versionNumber} published successfully!`);
      setPublishedVersion(versionNumber || null);

      // Refresh versions list
      await mutate();

      // Trigger a test run with the new version
      if (versionNumber) {
        const runResult = await executeAutomationScript({
          orgId,
          taskId,
          automationId: automationIdRef.current,
          version: versionNumber,
        });

        if (runResult.success) {
          toast.success('Running automation with published version');
        } else {
          toast.error(runResult.error || 'Failed to start automation run');
        }
      }

      // Show post-publish options instead of closing
      setShowPostPublishOptions(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish automation');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleGoToOverview = () => {
    handleDialogChange(false);
    router.push(`/${orgId}/tasks/${taskId}/automations/${automationIdRef.current}/overview`);
  };

  const handleStayHere = () => {
    handleDialogChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent>
        {!showPostPublishOptions ? (
          <>
            <DialogHeader>
              <DialogTitle>Publish Automation</DialogTitle>
              <DialogDescription>
                Create a new version of this automation. The current draft will remain editable.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="changelog">Changelog (optional)</Label>
                <Textarea
                  id="changelog"
                  placeholder="Describe what changed in this version..."
                  value={changelog}
                  onChange={(e) => setChangelog(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleDialogChange(false)}
                disabled={isPublishing}
              >
                Cancel
              </Button>
              <Button onClick={handlePublish} disabled={isPublishing}>
                {isPublishing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isPublishing ? 'Publishing...' : 'Publish'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Automation Published!</DialogTitle>
              <DialogDescription>
                Version {publishedVersion} has been published and is now running. Where would you like to go?
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleStayHere} className="w-full sm:w-auto">
                Stay Here
              </Button>
              <Button onClick={handleGoToOverview} className="w-full sm:w-auto">
                Go to Overview
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
