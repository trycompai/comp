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
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { publishAutomation } from '../actions/task-automation-actions';
import { useAutomationVersions } from '../hooks/use-automation-versions';
import { useSharedChatContext } from '../lib/chat-context';

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishDialog({ open, onOpenChange }: PublishDialogProps) {
  const { orgId, taskId } = useParams<{
    orgId: string;
    taskId: string;
    automationId: string;
  }>();
  const { automationIdRef } = useSharedChatContext();
  const [changelog, setChangelog] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const { mutate } = useAutomationVersions();

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

      toast.success(`Version ${result.version?.version} published successfully!`);
      setChangelog('');
      onOpenChange(false);

      // Refresh versions list
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish automation');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPublishing}>
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing}>
            {isPublishing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isPublishing ? 'Publishing...' : 'Publish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
