'use client';

import { createVersionAction } from '@/actions/policies/create-version';
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
import { Stack } from '@trycompai/design-system';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface PublishVersionDialogProps {
  policyId: string;
  currentVersionNumber?: number; // The published version number for display
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newVersionId: string) => void;
}

export function PublishVersionDialog({
  policyId,
  currentVersionNumber,
  isOpen,
  onClose,
  onSuccess,
}: PublishVersionDialogProps) {
  const router = useRouter();
  const [changelog, setChangelog] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);

    try {
      const result = await createVersionAction({
        policyId,
        changelog: changelog.trim() || undefined,
        entityId: policyId,
      });

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to create version');
      }

      const newVersionId = result.data.data?.versionId;
      toast.success(`Created version ${result.data.data?.version} as draft`);
      setChangelog('');
      onClose();
      if (newVersionId) {
        onSuccess?.(newVersionId);
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create version');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setChangelog('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Version</DialogTitle>
          <DialogDescription>
            {currentVersionNumber
              ? `This will create a new version based on the published version (v${currentVersionNumber}). `
              : 'This will create a new version from the current policy content. '}
            The new version will be saved as a draft and can be published through the approval workflow.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Stack gap="md">
            <div className="space-y-2">
              <Label htmlFor="changelog">Changelog (optional)</Label>
              <Textarea
                id="changelog"
                placeholder="Describe what changed in this version..."
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                rows={3}
              />
            </div>
          </Stack>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Version'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
