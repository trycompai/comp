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
import { Stack } from '@trycompai/design-system';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/use-permissions';
import { usePolicyVersions } from '../hooks/usePolicyVersions';

interface PublishVersionDialogProps {
  policyId: string;
  currentVersionNumber?: number;
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
  const { orgId } = useParams<{ orgId: string }>();
  const { hasPermission } = usePermissions();
  const { createVersion } = usePolicyVersions({
    policyId,
    organizationId: orgId,
  });

  const [changelog, setChangelog] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const response = await createVersion(changelog.trim() || undefined);
      const versionData = response.data?.data;
      const newVersionId = versionData?.versionId;
      toast.success(`Created version ${versionData?.version} as draft`);
      setChangelog('');
      onClose();
      if (newVersionId) {
        onSuccess?.(newVersionId);
      }
    } catch {
      toast.error('Failed to create version');
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
                placeholder="What changes will you make in this version?"
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
          <Button onClick={handleCreate} disabled={isCreating || !hasPermission('policy', 'update')}>
            {isCreating ? 'Creating...' : 'Create Version'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
