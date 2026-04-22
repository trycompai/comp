'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useFrameworkVersions } from '@/hooks/use-framework-versions';
import { useFrameworkDraftDiff } from '@/hooks/use-framework-draft-diff';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Stack,
  Text,
  Textarea,
} from '@trycompai/design-system';

function suggestNextVersion(current: string | undefined): string {
  if (!current) return '1.0.0';
  const [major, minor, patch] = current.split('.').map(Number);
  if ([major, minor, patch].some((n) => Number.isNaN(n))) return '1.0.0';
  return `${major}.${minor + 1}.0`;
}

function hasDiffChanges(
  diff: ReturnType<typeof useFrameworkDraftDiff>['data'],
): boolean {
  if (!diff) return false;
  const { controls, requirements, policies, tasks, requirementMapEdges, controlPolicyEdges, controlTaskEdges } =
    diff.diff;
  return (
    controls.added.length > 0 ||
    controls.removed.length > 0 ||
    controls.updated.length > 0 ||
    requirements.added.length > 0 ||
    requirements.removed.length > 0 ||
    requirements.updated.length > 0 ||
    policies.added.length > 0 ||
    policies.removed.length > 0 ||
    policies.updated.length > 0 ||
    tasks.added.length > 0 ||
    tasks.removed.length > 0 ||
    tasks.updated.length > 0 ||
    requirementMapEdges.added.length > 0 ||
    requirementMapEdges.removed.length > 0 ||
    controlPolicyEdges.added.length > 0 ||
    controlPolicyEdges.removed.length > 0 ||
    controlTaskEdges.added.length > 0 ||
    controlTaskEdges.removed.length > 0
  );
}

const publishSchema = z.object({
  version: z
    .string()
    .min(1, 'Version is required')
    .regex(/^\d+\.\d+\.\d+$/, 'Must be MAJOR.MINOR.PATCH format'),
  releaseNotes: z.string().optional(),
});

type PublishFormValues = z.infer<typeof publishSchema>;

interface PublishVersionDialogProps {
  frameworkId: string;
  open: boolean;
  onClose: () => void;
  latestVersion?: string;
}

export function PublishVersionDialog({
  frameworkId,
  open,
  onClose,
  latestVersion,
}: PublishVersionDialogProps) {
  const { mutate } = useFrameworkVersions(frameworkId);
  const { data: draftDiff, isLoading: diffLoading } = useFrameworkDraftDiff(frameworkId, {
    enabled: open,
  });
  const [collisionError, setCollisionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PublishFormValues>({
    resolver: zodResolver(publishSchema),
    values: {
      version: suggestNextVersion(latestVersion),
      releaseNotes: '',
    },
  });

  const hasChanges = hasDiffChanges(draftDiff);
  const canPublish = hasChanges && !diffLoading;

  const handlePublish = async (values: PublishFormValues) => {
    setCollisionError(null);
    const res = await apiClient.post<{ data: { id: string } }>(
      `/v1/framework-editor/framework/${frameworkId}/versions`,
      {
        version: values.version,
        releaseNotes: values.releaseNotes || undefined,
      },
    );

    if (res.status === 409) {
      setCollisionError(`Version ${values.version} is already published. Choose a different version.`);
      return;
    }

    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success(`Version v${values.version} published`);
    await mutate();
    handleClose();
  };

  const handleClose = () => {
    reset();
    setCollisionError(null);
    onClose();
  };

  const diff = draftDiff?.diff;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit(handlePublish)}>
          <DialogHeader>
            <DialogTitle>Publish New Version</DialogTitle>
            <DialogDescription>
              Create a new published snapshot of this framework. All organizations
              tracking this framework will be able to update to this version.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Stack gap="md">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pub-version">Version</Label>
                <Input
                  id="pub-version"
                  placeholder="e.g. 1.1.0"
                  {...register('version')}
                />
                {errors.version && (
                  <Text size="xs" variant="destructive">
                    {errors.version.message}
                  </Text>
                )}
                {collisionError && (
                  <Text size="xs" variant="destructive">
                    {collisionError}
                  </Text>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pub-notes">Release Notes (optional)</Label>
                <Textarea
                  id="pub-notes"
                  placeholder="What changed in this version?"
                  rows={4}
                  {...register('releaseNotes')}
                />
              </div>

              <div className="rounded-md border p-4">
                <Text size="sm" weight="medium">
                  Draft Changes
                </Text>
                {diffLoading && (
                  <Text size="sm" variant="muted">
                    Computing diff...
                  </Text>
                )}
                {!diffLoading && !draftDiff && (
                  <Text size="sm" variant="muted">
                    No published version found. This will publish the first version.
                  </Text>
                )}
                {!diffLoading && diff && (
                  <div className="mt-2 flex flex-col gap-1">
                    {!hasChanges && (
                      <Text size="sm" variant="muted">
                        No changes detected since the last published version.
                      </Text>
                    )}
                    {diff.controls.added.length > 0 && (
                      <Text size="sm" variant="muted">
                        Controls added: {diff.controls.added.length}
                      </Text>
                    )}
                    {diff.controls.removed.length > 0 && (
                      <Text size="sm" variant="muted">
                        Controls removed: {diff.controls.removed.length}
                      </Text>
                    )}
                    {diff.controls.updated.length > 0 && (
                      <Text size="sm" variant="muted">
                        Controls updated: {diff.controls.updated.length}
                      </Text>
                    )}
                    {diff.policies.added.length > 0 && (
                      <Text size="sm" variant="muted">
                        Policies added: {diff.policies.added.length}
                      </Text>
                    )}
                    {diff.policies.removed.length > 0 && (
                      <Text size="sm" variant="muted">
                        Policies removed: {diff.policies.removed.length}
                      </Text>
                    )}
                    {diff.policies.updated.length > 0 && (
                      <Text size="sm" variant="muted">
                        Policies updated: {diff.policies.updated.length}
                      </Text>
                    )}
                    {diff.tasks.added.length > 0 && (
                      <Text size="sm" variant="muted">
                        Tasks added: {diff.tasks.added.length}
                      </Text>
                    )}
                    {diff.tasks.removed.length > 0 && (
                      <Text size="sm" variant="muted">
                        Tasks removed: {diff.tasks.removed.length}
                      </Text>
                    )}
                    {diff.tasks.updated.length > 0 && (
                      <Text size="sm" variant="muted">
                        Tasks updated: {diff.tasks.updated.length}
                      </Text>
                    )}
                    {diff.requirements.added.length > 0 && (
                      <Text size="sm" variant="muted">
                        Requirements added: {diff.requirements.added.length}
                      </Text>
                    )}
                    {diff.requirements.removed.length > 0 && (
                      <Text size="sm" variant="muted">
                        Requirements removed: {diff.requirements.removed.length}
                      </Text>
                    )}
                    {diff.requirements.updated.length > 0 && (
                      <Text size="sm" variant="muted">
                        Requirements updated: {diff.requirements.updated.length}
                      </Text>
                    )}
                  </div>
                )}
              </div>
            </Stack>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting || (!diffLoading && draftDiff !== undefined && !hasChanges)}
            >
              Publish Version
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
