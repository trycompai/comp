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
import { useFrameworkDraftDiff } from '../hooks/useFrameworkDraftDiff';
import { VersionDiffView, hasAnyChanges } from './VersionDiffView';

function suggestNextVersion(current: string | undefined): string {
  if (!current) return '1.0.0';
  const parts = current.split('.').map(Number);
  const [major, minor] = parts;
  if (parts.some((n) => Number.isNaN(n))) return '1.0.0';
  return `${major}.${minor + 1}.0`;
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

  const hasChanges = draftDiff?.diff ? hasAnyChanges(draftDiff.diff) : false;

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
      <DialogContent className="sm:max-w-[720px]">
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

            <div className="rounded-md border">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-medium">Draft changes</p>
                {diffLoading && (
                  <p className="text-muted-foreground mt-1 text-xs">Computing diff…</p>
                )}
                {!diffLoading && !draftDiff && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    No published version found. This will publish the first version.
                  </p>
                )}
                {!diffLoading && diff && !hasChanges && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    No changes detected since the last published version.
                  </p>
                )}
              </div>
              {!diffLoading && diff && hasChanges && (
                <div className="max-h-[320px] overflow-y-auto">
                  <VersionDiffView diff={diff} linkChanges={draftDiff?.linkChanges} />
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

