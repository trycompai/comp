'use client';

import type { UseFormReturn } from 'react-hook-form';
import { usePentestFindingContexts } from '../hooks/use-pentest-finding-contexts';
import type { CreateRunForm } from './CreateRunPanel';

interface RunContextFieldProps {
  orgId: string;
  /** Normalized target URL (or null while the field is empty/invalid). */
  targetUrl: string | null;
  form: UseFormReturn<CreateRunForm>;
}

/**
 * Optional free-text briefing for the testing agent on this run, plus a
 * hint showing how many saved per-finding context notes for the target
 * will be appended automatically by the API.
 */
export function RunContextField({ orgId, targetUrl, form }: RunContextFieldProps) {
  const { contexts } = usePentestFindingContexts(orgId, targetUrl);

  return (
    <div className="mb-5">
      <label
        htmlFor="pt-additional-context"
        className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground"
      >
        <span>Context for the agent</span>
        <span className="font-normal normal-case tracking-normal text-muted-foreground">
          (optional)
        </span>
      </label>
      <textarea
        id="pt-additional-context"
        {...form.register('additionalContext')}
        rows={3}
        placeholder="Anything the testing agent should know — remediations since the last run, accepted-by-design behavior, areas to focus on…"
        className="w-full resize-y rounded border border-border bg-background px-3 py-2 text-xs leading-relaxed outline-none focus-visible:border-primary"
      />
      {form.formState.errors.additionalContext ? (
        <p className="mt-1 text-[11px] text-destructive">
          {form.formState.errors.additionalContext.message}
        </p>
      ) : null}
      <p className="mt-1 text-[11px] text-muted-foreground">
        {contexts.length > 0
          ? `${contexts.length} saved finding context note${
              contexts.length === 1 ? '' : 's'
            } for this target will be shared with the agent automatically.`
          : 'Context notes saved on findings from previous scans of this target are shared automatically.'}
      </p>
    </div>
  );
}
