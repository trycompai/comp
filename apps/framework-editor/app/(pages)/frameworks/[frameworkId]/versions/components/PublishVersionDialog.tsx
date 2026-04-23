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
import type {
  DraftDiff,
  DiffControl,
  DiffPolicy,
  DiffRequirement,
  DiffTask,
} from '../hooks/useFrameworkDraftDiff';
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
  const {
    controls,
    requirements,
    policies,
    tasks,
    requirementMapEdges,
    controlPolicyEdges,
    controlTaskEdges,
    controlDocumentTypeEdges,
  } = diff.diff;
  const docTypeEdges = controlDocumentTypeEdges ?? { added: [], removed: [] };
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
    controlTaskEdges.removed.length > 0 ||
    docTypeEdges.added.length > 0 ||
    docTypeEdges.removed.length > 0
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
                  <DiffDetailSection
                    title="Requirements"
                    added={diff.requirements.added}
                    removed={diff.requirements.removed}
                    updated={diff.requirements.updated}
                    renderRow={(r: DiffRequirement) => (
                      <span>
                        <span className="font-mono text-muted-foreground mr-2">{r.identifier}</span>
                        {r.name}
                      </span>
                    )}
                  />
                  <DiffDetailSection
                    title="Controls"
                    added={diff.controls.added}
                    removed={diff.controls.removed}
                    updated={diff.controls.updated}
                    renderRow={(c: DiffControl) => <span>{c.name}</span>}
                  />
                  <DiffDetailSection
                    title="Policies"
                    added={diff.policies.added}
                    removed={diff.policies.removed}
                    updated={diff.policies.updated}
                    renderRow={(p: DiffPolicy) => <span>{p.name}</span>}
                  />
                  <DiffDetailSection
                    title="Tasks"
                    added={diff.tasks.added}
                    removed={diff.tasks.removed}
                    updated={diff.tasks.updated}
                    renderRow={(t: DiffTask) => <span>{t.name}</span>}
                  />
                  <LinkEdgeSection
                    title="Control → requirement links"
                    added={diff.requirementMapEdges.added.length}
                    removed={diff.requirementMapEdges.removed.length}
                  />
                  <LinkEdgeSection
                    title="Control → policy links"
                    added={diff.controlPolicyEdges.added.length}
                    removed={diff.controlPolicyEdges.removed.length}
                  />
                  <LinkEdgeSection
                    title="Control → task links"
                    added={diff.controlTaskEdges.added.length}
                    removed={diff.controlTaskEdges.removed.length}
                  />
                  <LinkEdgeSection
                    title="Control → document-type links"
                    added={diff.controlDocumentTypeEdges?.added.length ?? 0}
                    removed={diff.controlDocumentTypeEdges?.removed.length ?? 0}
                  />
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

interface DiffDetailSectionProps<T extends { id: string }> {
  title: string;
  added: T[];
  removed: T[];
  updated: Array<{ id: string; from: T; to: T }>;
  renderRow: (item: T) => React.ReactNode;
}

function DiffDetailSection<T extends { id: string }>({
  title,
  added,
  removed,
  updated,
  renderRow,
}: DiffDetailSectionProps<T>) {
  if (added.length === 0 && removed.length === 0 && updated.length === 0) return null;
  return (
    <div className="border-b last:border-b-0 px-4 py-3">
      <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
        {title}
      </p>
      <div className="flex flex-col gap-1">
        {added.map((item) => (
          <DiffRow key={`a-${item.id}`} kind="added">{renderRow(item)}</DiffRow>
        ))}
        {removed.map((item) => (
          <DiffRow key={`r-${item.id}`} kind="removed">{renderRow(item)}</DiffRow>
        ))}
        {updated.map((u) => (
          <DiffRow key={`u-${u.id}`} kind="modified">{renderRow(u.to)}</DiffRow>
        ))}
      </div>
    </div>
  );
}

function DiffRow({
  kind,
  children,
}: {
  kind: 'added' | 'removed' | 'modified';
  children: React.ReactNode;
}) {
  const markerClass =
    kind === 'added'
      ? 'bg-green-100 text-green-700'
      : kind === 'removed'
        ? 'bg-red-100 text-red-700'
        : 'bg-slate-100 text-slate-700';
  const marker = kind === 'added' ? '+' : kind === 'removed' ? '−' : '~';
  const label = kind.charAt(0).toUpperCase() + kind.slice(1);
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <span
          className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-[10px] font-semibold ${markerClass}`}
        >
          {marker}
        </span>
        <span className="text-sm">{children}</span>
      </div>
      <span className="text-muted-foreground shrink-0 text-xs">{label}</span>
    </div>
  );
}

function LinkEdgeSection({
  title,
  added,
  removed,
}: {
  title: string;
  added: number;
  removed: number;
}) {
  if (added === 0 && removed === 0) return null;
  return (
    <div className="border-b last:border-b-0 px-4 py-3">
      <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
        {title}
      </p>
      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        {added > 0 && (
          <span>
            {added} link{added !== 1 ? 's' : ''} added
          </span>
        )}
        {removed > 0 && (
          <span>
            {removed} link{removed !== 1 ? 's' : ''} removed
          </span>
        )}
      </div>
    </div>
  );
}
