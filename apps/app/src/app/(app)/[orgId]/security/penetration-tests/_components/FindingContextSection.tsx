'use client';

import { usePermissions } from '@/hooks/use-permissions';
import type { PentestIssue } from '@/lib/security/penetration-tests-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Textarea } from '@trycompai/design-system';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { usePentestFindingContexts } from '../hooks/use-pentest-finding-contexts';

const findingContextSchema = z.object({
  context: z
    .string()
    .trim()
    .min(1, 'Context is required.')
    .max(2000, 'Keep context under 2000 characters.'),
});

type FindingContextForm = z.infer<typeof findingContextSchema>;

interface FindingContextSectionProps {
  orgId: string;
  issue: PentestIssue;
  runId?: string | null;
  targetUrl?: string | null;
}

/**
 * Customer context note on a single finding ("accepted by design
 * because…", "fixed via…"). Saved notes are automatically shared with the
 * testing agent on future scans of the same target, so retests validate
 * against the customer's explanation instead of blindly re-flagging.
 * Editing requires `pentest:update`; read-only roles see the saved note.
 */
export function FindingContextSection({
  orgId,
  issue,
  runId,
  targetUrl,
}: FindingContextSectionProps) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('pentest', 'update');
  const { contextByIssueId, isSaving, saveContext, removeContext } =
    usePentestFindingContexts(orgId, targetUrl);
  const existing = contextByIssueId.get(issue.id);
  const resolvedRunId = issue.runId ?? runId ?? null;

  const form = useForm<FindingContextForm>({
    resolver: zodResolver(findingContextSchema),
    values: { context: existing?.context ?? '' },
  });

  if (!targetUrl) return null;
  if (!canEdit && !existing) return null;

  const handleSave = form.handleSubmit(async (values) => {
    if (!resolvedRunId) return;
    try {
      await saveContext({
        issueId: issue.id,
        runId: resolvedRunId,
        context: values.context,
      });
      toast.success('Context saved — future scans of this target will include it');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save context');
    }
  });

  const handleRemove = async () => {
    try {
      await removeContext(issue.id);
      form.reset({ context: '' });
      toast.success('Context removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to remove context');
    }
  };

  return (
    <section className="rounded-[var(--radius)] border border-border bg-card p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Retest context
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Explain this finding — e.g. why it&apos;s accepted by design or how it was
        remediated. Notes are shared with the testing agent on future scans of this
        target, so retests take your context into account instead of re-flagging
        blindly.
      </p>

      {canEdit ? (
        <form onSubmit={handleSave} className="mt-3 space-y-2">
          <Textarea
            size="full"
            rows={4}
            placeholder="e.g. Read access to appConfiguration is accepted by design — the collection holds non-secret bootstrap config and writes are restricted to privileged users."
            disabled={isSaving || !resolvedRunId}
            {...form.register('context')}
          />
          {form.formState.errors.context ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.context.message}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              size="sm"
              loading={isSaving}
              disabled={isSaving || !form.formState.isDirty || !resolvedRunId}
            >
              {existing ? 'Update context' : 'Save context'}
            </Button>
            {existing ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSaving}
                onClick={() => void handleRemove()}
              >
                Remove
              </Button>
            ) : null}
            {existing ? (
              <span className="text-[11px] text-muted-foreground">
                Included in future scans of this target
              </span>
            ) : null}
          </div>
        </form>
      ) : existing ? (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
          {existing.context}
        </p>
      ) : null}
    </section>
  );
}
