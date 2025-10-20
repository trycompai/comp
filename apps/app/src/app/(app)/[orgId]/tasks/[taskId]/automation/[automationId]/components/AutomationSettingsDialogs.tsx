'use client';

import { api } from '@/lib/api-client';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import { Textarea } from '@comp/ui/textarea';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTaskAutomation } from '../hooks/use-task-automation';

interface EditNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface EditDescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditNameDialog({ open, onOpenChange, onSuccess }: EditNameDialogProps) {
  const { automation, mutate: mutateLocal } = useTaskAutomation();
  const { orgId, taskId, automationId } = useParams<{
    orgId: string;
    taskId: string;
    automationId: string;
  }>();

  // Use real automation ID when available
  const realAutomationId = automation?.id || automationId;

  const [name, setName] = useState(automation?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when automation data changes
  useEffect(() => {
    setName(automation?.name || '');
  }, [automation?.name]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.patch(
        `/v1/tasks/${taskId}/automations/${realAutomationId}`,
        { name: name.trim() },
        orgId,
      );

      if (response.error) {
        throw new Error(response.error);
      }

      await mutateLocal(); // Refresh automation data in hook
      await onSuccess?.(); // Notify parent to refresh (e.g., overview page)
      onOpenChange(false);
      toast.success('Automation name updated');
    } catch (error) {
      toast.error('Failed to update name');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Automation Name</DialogTitle>
          <DialogDescription>
            Update the name for this automation. This will help you identify it later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="automation-name">Automation Name</Label>
            <Input
              id="automation-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter automation name"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditDescriptionDialog({
  open,
  onOpenChange,
  onSuccess,
}: EditDescriptionDialogProps) {
  const { automation, mutate: mutateLocal } = useTaskAutomation();
  const { orgId, taskId, automationId } = useParams<{
    orgId: string;
    taskId: string;
    automationId: string;
  }>();
  const [description, setDescription] = useState(automation?.description || '');
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when automation data changes
  useEffect(() => {
    setDescription(automation?.description || '');
  }, [automation?.description]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await api.patch(
        `/v1/tasks/${taskId}/automations/${automationId}`,
        { description: description.trim() },
        orgId,
      );

      if (response.error) {
        throw new Error(response.error);
      }

      await mutateLocal(); // Refresh automation data in hook
      await onSuccess?.(); // Notify parent to refresh (e.g., overview page)
      onOpenChange(false);
      toast.success('Automation description updated');
    } catch (error) {
      toast.error('Failed to update description');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Automation Description</DialogTitle>
          <DialogDescription>
            Add or update the description for this automation to help others understand its purpose.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="automation-description">Description</Label>
            <Textarea
              id="automation-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this automation does..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteAutomationDialog({ open, onOpenChange, onSuccess }: DeleteDialogProps) {
  const { automation } = useTaskAutomation();
  const { orgId, taskId, automationId } = useParams<{
    orgId: string;
    taskId: string;
    automationId: string;
  }>();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await api.delete(`/v1/tasks/${taskId}/automations/${automationId}`, orgId);

      if (response.error) {
        throw new Error(response.error);
      }

      onOpenChange(false);
      toast.success('Automation deleted');

      // Redirect back to task page after successful deletion
      window.location.href = `/${orgId}/tasks/${taskId}`;
    } catch (error) {
      toast.error('Failed to delete automation');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Automation</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{automation?.name}"? This action cannot be undone and
            will permanently remove the automation and all its data.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete Automation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
