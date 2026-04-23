'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from '@trycompai/ui';
import { useEffect, useState } from 'react';
import { useForm, type ControllerRenderProps } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { apiClient } from '@/app/lib/api-client';
import type { DraftDiff } from '../hooks/useFrameworkDraftDiff';
import { useFrameworkDraftDiff } from '../hooks/useFrameworkDraftDiff';
import type { FrameworkVersionListItem } from '../hooks/useFrameworkVersions';

function suggestNextVersion(current: string | undefined): string {
  if (!current) return '1.0.0';
  const parts = current.split('.').map(Number);
  const [major, minor] = parts;
  if (parts.some((n) => Number.isNaN(n))) return '1.0.0';
  return `${major}.${minor + 1}.0`;
}

function hasDiffChanges(diff: DraftDiff | undefined): boolean {
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
  onPublished: () => void;
}

export function PublishVersionDialog({
  frameworkId,
  open,
  onClose,
  latestVersion,
  onPublished,
}: PublishVersionDialogProps) {
  const { data: draftDiff, isLoading: diffLoading } = useFrameworkDraftDiff(frameworkId, {
    enabled: open,
  });
  const [collisionError, setCollisionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PublishFormValues>({
    resolver: zodResolver(publishSchema),
    defaultValues: {
      version: suggestNextVersion(latestVersion),
      releaseNotes: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        version: suggestNextVersion(latestVersion),
        releaseNotes: '',
      });
      setCollisionError(null);
    }
  }, [open, latestVersion, form]);

  const hasChanges = hasDiffChanges(draftDiff);
  const canPublish = hasChanges && !diffLoading;

  const handlePublish = async (values: PublishFormValues) => {
    setCollisionError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/v1/framework-editor/framework/${frameworkId}/versions`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: values.version,
            releaseNotes: values.releaseNotes || undefined,
          }),
        },
      );

      if (res.status === 409) {
        setCollisionError(
          `Version ${values.version} is already published. Choose a different version.`,
        );
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        toast.error(text || 'Failed to publish version');
        return;
      }

      toast.success(`Version v${values.version} published`);
      onPublished();
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish version');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setCollisionError(null);
    onClose();
  };

  const diff = draftDiff?.diff;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Publish New Version</DialogTitle>
          <DialogDescription>
            Create a new published snapshot of this framework. All organizations tracking this
            framework will be able to update to this version.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handlePublish)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="version"
              render={({
                field,
              }: {
                field: ControllerRenderProps<PublishFormValues, 'version'>;
              }) => (
                <FormItem>
                  <FormLabel>Version</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 1.1.0" {...field} className="rounded-sm" />
                  </FormControl>
                  <FormMessage />
                  {collisionError && (
                    <p className="text-destructive text-xs">{collisionError}</p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="releaseNotes"
              render={({
                field,
              }: {
                field: ControllerRenderProps<PublishFormValues, 'releaseNotes'>;
              }) => (
                <FormItem>
                  <FormLabel>Release Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What changed in this version?"
                      rows={4}
                      {...field}
                      className="rounded-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-md border p-4">
              <p className="text-sm font-medium">Draft Changes</p>
              {diffLoading && (
                <p className="text-muted-foreground mt-1 text-sm">Computing diff...</p>
              )}
              {!diffLoading && !draftDiff && (
                <p className="text-muted-foreground mt-1 text-sm">
                  No published version found. This will publish the first version.
                </p>
              )}
              {!diffLoading && diff && (
                <div className="mt-2 flex flex-col gap-1">
                  {!hasChanges && (
                    <p className="text-muted-foreground text-sm">
                      No changes detected since the last published version.
                    </p>
                  )}
                  {diff.controls.added.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Controls added: {diff.controls.added.length}
                    </p>
                  )}
                  {diff.controls.removed.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Controls removed: {diff.controls.removed.length}
                    </p>
                  )}
                  {diff.controls.updated.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Controls updated: {diff.controls.updated.length}
                    </p>
                  )}
                  {diff.policies.added.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Policies added: {diff.policies.added.length}
                    </p>
                  )}
                  {diff.policies.removed.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Policies removed: {diff.policies.removed.length}
                    </p>
                  )}
                  {diff.policies.updated.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Policies updated: {diff.policies.updated.length}
                    </p>
                  )}
                  {diff.tasks.added.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Tasks added: {diff.tasks.added.length}
                    </p>
                  )}
                  {diff.tasks.removed.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Tasks removed: {diff.tasks.removed.length}
                    </p>
                  )}
                  {diff.tasks.updated.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Tasks updated: {diff.tasks.updated.length}
                    </p>
                  )}
                  {diff.requirements.added.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Requirements added: {diff.requirements.added.length}
                    </p>
                  )}
                  {diff.requirements.removed.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Requirements removed: {diff.requirements.removed.length}
                    </p>
                  )}
                  {diff.requirements.updated.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Requirements updated: {diff.requirements.updated.length}
                    </p>
                  )}
                  {diff.requirementMapEdges.added.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Control → requirement links added: {diff.requirementMapEdges.added.length}
                    </p>
                  )}
                  {diff.requirementMapEdges.removed.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Control → requirement links removed: {diff.requirementMapEdges.removed.length}
                    </p>
                  )}
                  {diff.controlPolicyEdges.added.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Control → policy links added: {diff.controlPolicyEdges.added.length}
                    </p>
                  )}
                  {diff.controlPolicyEdges.removed.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Control → policy links removed: {diff.controlPolicyEdges.removed.length}
                    </p>
                  )}
                  {diff.controlTaskEdges.added.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Control → task links added: {diff.controlTaskEdges.added.length}
                    </p>
                  )}
                  {diff.controlTaskEdges.removed.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Control → task links removed: {diff.controlTaskEdges.removed.length}
                    </p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isSubmitting}
                className="rounded-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || (!diffLoading && draftDiff !== undefined && !hasChanges)}
                className="rounded-sm"
              >
                {isSubmitting ? 'Publishing...' : 'Publish Version'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
