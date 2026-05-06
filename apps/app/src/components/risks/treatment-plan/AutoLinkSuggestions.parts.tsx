'use client';

import { Button } from '@trycompai/design-system';
import { MagicWandFilled } from '@trycompai/design-system/icons';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { useEffect, useMemo, useRef } from 'react';
import { ControlsSection, TasksSection } from './AutoLinkSuggestions.sections';
import {
  isControlDerived,
  type SuggestedControl,
  type SuggestedTask,
} from './AutoLinkSuggestions.types';

export function EmptyState({
  canUpdate,
  submitting,
  onSuggest,
  onStartFromScratch,
  variant = 'default',
}: {
  canUpdate: boolean;
  submitting: boolean;
  onSuggest: () => void;
  /** Required when variant === 'kickoff' — dismisses the kickoff so the user
   *  can write the plan manually. Ignored for other variants. */
  onStartFromScratch?: () => void;
  /**
   * `'kickoff'` — the wide centered panel ("Let AI kick this off") shown when
   *   plan and tasks are both empty. Has a primary "Draft plan & suggest
   *   links" button plus a "Start from scratch" escape hatch.
   * `'kickoff-with-plan'` — same wide panel, copy adapted for the case where
   *   a plan already exists ("AI will only suggest tasks/controls; your plan
   *   stays as-is unless you regenerate").
   * `'default'` — the smaller per-column empty CTA shown when the user has a
   *   plan but no linked tasks yet.
   */
  variant?: 'default' | 'kickoff' | 'kickoff-with-plan';
}) {
  // Adapt kickoff copy based on whether a plan already exists. The same
  // wide-panel layout applies in both cases.
  const isKickoff = variant === 'kickoff' || variant === 'kickoff-with-plan';
  if (isKickoff) {
    const hasPlan = variant === 'kickoff-with-plan';
    const title = hasPlan ? 'Let AI suggest tasks and controls' : 'Let AI kick this off';
    const description = hasPlan
      ? "Based on your treatment plan, AI can scan your library and suggest the tasks and controls most likely to drive this risk down. You'll review everything before anything is linked."
      : "Based on the strategy above, AI can draft a treatment plan and suggest the tasks and controls most likely to drive this risk down. You'll review everything before anything is saved or linked.";
    const primaryLabel = hasPlan ? 'Suggest tasks & controls' : 'Draft plan & suggest links';
    const escapeLabel = hasPlan ? 'Edit plan manually' : 'Start from scratch';

    return (
      <div className="flex flex-col items-center rounded-md bg-primary/[0.05] px-6 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/[0.12] text-primary">
          <MagicWandFilled size={24} aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-xl font-normal tracking-[-0.01em]">{title}</h3>
        <p className="mt-3 max-w-[520px] text-sm leading-[1.55] text-muted-foreground">
          {description}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            iconLeft={<MagicWandFilled aria-hidden="true" />}
            onClick={onSuggest}
            loading={submitting}
            disabled={!canUpdate}
          >
            {primaryLabel}
          </Button>
          <Button variant="ghost" onClick={onStartFromScratch} disabled={!canUpdate}>
            {escapeLabel}
          </Button>
        </div>
        <div className="mt-8 grid w-full max-w-[640px] grid-cols-1 gap-6 border-t border-border pt-5 text-left sm:grid-cols-2">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              02 · Plan
            </div>
            <div className="mt-1.5 text-xs text-muted-foreground">
              {hasPlan
                ? 'Your existing plan stays as-is unless you regenerate.'
                : 'A concrete plan grounded in the selected tasks and controls.'}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              03 · Links
            </div>
            <div className="mt-1.5 text-xs text-muted-foreground">
              Tasks and framework controls AI ranks for this risk.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col items-center rounded-md border border-dashed border-border bg-primary/[0.02] px-4 py-7 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/[0.12] text-primary">
        <MagicWandFilled size={20} aria-hidden="true" />
      </div>
      <div className="mt-3 text-sm font-normal">No tasks or controls linked yet</div>
      <div className="mt-1 max-w-[320px] text-xs leading-[1.5] text-muted-foreground">
        Have AI scan your library and suggest the tasks and controls most likely to drive this risk
        down.
      </div>
      <div className="mt-4">
        <Button
          size="sm"
          iconLeft={<MagicWandFilled aria-hidden="true" />}
          onClick={onSuggest}
          loading={submitting}
          disabled={!canUpdate}
        >
          Suggest with AI
        </Button>
      </div>
      <div className="mt-2.5 text-[11px] text-muted-foreground">
        You'll review before anything is linked.
      </div>
    </div>
  );
}

/**
 * Statuses we treat as "in flight, render the loading UI". Anything outside
 * this set is either terminal-success (COMPLETED) or terminal-failure (which
 * we surface via FailedState).
 */
const IN_FLIGHT_STATUSES = new Set([
  'WAITING_FOR_DEPLOY',
  'DELAYED',
  'QUEUED',
  'EXECUTING',
  'INTERRUPTED',
  'WAITING_TO_RESUME',
]);

/**
 * Terminal failures we route to FailedState. EXPIRED happens when a run sits
 * in the queue past its TTL; TIMED_OUT when execution exceeds maxDuration.
 */
const TERMINAL_FAILURE_STATUSES = new Set([
  'FAILED',
  'CANCELED',
  'CRASHED',
  'SYSTEM_FAILURE',
  'EXPIRED',
  'TIMED_OUT',
]);

/**
 * Phases written to `metadata.phase` by the trigger task wrapper. Mirrored
 * from `LinkagePhase` in `lib/embedding/run-linkage.ts`.
 */
type PhaseName =
  | 'starting'
  | 'embedding-tasks'
  | 'embedding-risks'
  | 'embedding-vendors'
  | 'waiting-for-index'
  | 'matching-risks'
  | 'matching-vendors'
  | 'done';

function describeStatus(
  status: string | undefined,
  phase: PhaseName | undefined,
  current: number | undefined,
  total: number | undefined,
): { headline: string; sub: string } {
  if (!status || status === 'WAITING_FOR_DEPLOY') {
    return {
      headline: 'Waiting for a worker…',
      sub: 'Allocating compute capacity.',
    };
  }
  if (status === 'QUEUED' || status === 'DELAYED') {
    return {
      headline: 'Queued — waiting to start…',
      sub: 'Your scan will pick up momentarily.',
    };
  }
  if (status === 'INTERRUPTED' || status === 'WAITING_TO_RESUME') {
    return {
      headline: 'Resuming…',
      sub: 'Picking up where the run left off.',
    };
  }
  // EXECUTING from here down — describe by phase metadata.
  if (!phase || phase === 'starting') {
    return {
      headline: 'Starting AI scan…',
      sub: 'Initializing the suggestion run.',
    };
  }
  if (phase === 'embedding-tasks') {
    const progress = total ? ` (${current ?? 0} / ${total})` : '';
    return {
      headline: 'Embedding your task library…',
      sub: `Indexing tasks for semantic search${progress}.`,
    };
  }
  if (phase === 'embedding-risks' || phase === 'embedding-vendors') {
    return {
      headline: 'Embedding the subject…',
      sub: 'Preparing the query vector.',
    };
  }
  if (phase === 'waiting-for-index') {
    return {
      headline: 'Waiting for the index…',
      sub: 'Letting the vector store finish ingesting before we query it.',
    };
  }
  if (phase === 'matching-risks' || phase === 'matching-vendors') {
    return {
      headline: 'Scanning your library…',
      sub: 'Matching candidates and reranking with AI.',
    };
  }
  // 'done' — the status itself will flip to COMPLETED imminently.
  return {
    headline: 'Wrapping up…',
    sub: 'Compiling the final suggestions.',
  };
}

export function LoadingState({
  runId,
  accessToken,
  onReady,
  onFailed,
}: {
  runId: string;
  accessToken: string;
  onReady: (s: { tasks: SuggestedTask[]; controls: SuggestedControl[] }) => void;
  onFailed: (reason: string) => void;
}) {
  const { run } = useRealtimeRun(runId, { accessToken, enabled: true });
  const status = run?.status;
  const output = run?.output as
    | { suggestions?: { tasks?: SuggestedTask[]; controls?: SuggestedControl[] } }
    | undefined;
  const meta = (run?.metadata ?? {}) as {
    phase?: PhaseName;
    current?: number;
    total?: number;
  };

  // Stash callbacks in refs so the effect can fire only on `status` changes
  // (we never want to re-fire on every parent render that changes callback
  // identity), but always read the freshest `output` and handlers — avoids
  // the stale-closure race Cubic flagged (#32 on PR #2671).
  const outputRef = useRef(output);
  outputRef.current = output;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onFailedRef = useRef(onFailed);
  onFailedRef.current = onFailed;

  useEffect(() => {
    if (!status) return;
    if (status === 'COMPLETED') {
      const sugg = outputRef.current?.suggestions;
      onReadyRef.current({
        tasks: Array.isArray(sugg?.tasks) ? sugg.tasks : [],
        controls: Array.isArray(sugg?.controls) ? sugg.controls : [],
      });
      return;
    }
    if (TERMINAL_FAILURE_STATUSES.has(status)) {
      const reasons: Record<string, string> = {
        FAILED: 'The AI scan hit an error.',
        CANCELED: 'The AI scan was canceled.',
        CRASHED: 'The worker crashed mid-scan.',
        SYSTEM_FAILURE: 'A system error stopped the scan.',
        EXPIRED: 'The scan expired before it could start.',
        TIMED_OUT: 'The scan took too long and timed out.',
      };
      onFailedRef.current(reasons[status] ?? 'The AI scan failed.');
    }
  }, [status]);

  // Treat unknown / pre-subscribe state as in-flight so the spinner stays up
  // until the realtime stream catches up.
  const inFlight = !status || IN_FLIGHT_STATUSES.has(status);
  if (!inFlight) {
    // Either COMPLETED (the effect above will transition state) or terminal
    // failure (same). Render a quiet placeholder for the brief gap.
    return (
      <div className="mt-4 border-t border-border pt-4" role="status" aria-live="polite">
        <div className="text-[13px] text-muted-foreground">Finishing up…</div>
      </div>
    );
  }

  const { headline, sub } = describeStatus(status, meta.phase, meta.current, meta.total);
  const showProgress = meta.phase === 'embedding-tasks' && typeof meta.total === 'number' && meta.total > 0;
  const pct = showProgress
    ? Math.min(100, Math.round(((meta.current ?? 0) / (meta.total ?? 1)) * 100))
    : null;

  return (
    <div className="mt-4 border-t border-border pt-4" role="status" aria-live="polite">
      <div className="mb-3.5 flex items-center gap-2">
        <span
          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-primary"
          aria-hidden="true"
        />
        <span className="text-[13px]">{headline}</span>
      </div>
      <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
        {sub}
      </div>
      {pct !== null && (
        <div className="mb-4 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
            aria-hidden="true"
          />
        </div>
      )}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-2.5 border-b border-border py-2"
          style={{ animationDelay: `${i * 120}ms` }}
        >
          <div className="h-3.5 w-3.5 rounded-[3px] bg-muted" />
          <div className="h-2 rounded bg-muted" style={{ width: `${60 + ((i * 7) % 30)}%` }} />
        </div>
      ))}
    </div>
  );
}

export function FailedState({
  reason,
  retrying,
  onRetry,
  onDiscard,
}: {
  reason: string;
  retrying: boolean;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  return (
    <div
      role="alert"
      className="mt-4 flex flex-col items-start gap-3 rounded-md border border-destructive/40 bg-destructive/[0.06] px-4 py-4"
    >
      <div>
        <div className="text-sm font-normal text-destructive">Auto-link failed</div>
        <div className="mt-1 text-xs leading-[1.5] text-muted-foreground">{reason}</div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          iconLeft={<MagicWandFilled aria-hidden="true" />}
          onClick={onRetry}
          loading={retrying}
        >
          Retry
        </Button>
        <Button variant="ghost" size="sm" onClick={onDiscard} disabled={retrying}>
          Discard
        </Button>
      </div>
    </div>
  );
}

export function SuggestionsState({
  tasks,
  controls,
  checkedTaskIds,
  applying,
  submitting,
  onToggle,
  onDiscard,
  onApply,
  onRerun,
}: {
  tasks: SuggestedTask[];
  controls: SuggestedControl[];
  checkedTaskIds: Set<string>;
  applying: boolean;
  submitting: boolean;
  onToggle: (id: string) => void;
  onDiscard: () => void;
  onApply: () => void;
  onRerun: () => void;
}) {
  const derivedControlsCount = useMemo(
    () => controls.filter((c) => isControlDerived(c, checkedTaskIds)).length,
    [controls, checkedTaskIds],
  );
  const taskCount = tasks.length;
  const controlCount = controls.length;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div
        className="mb-4 flex items-center gap-2 rounded-md border bg-primary/[0.06] px-2.5 py-2"
        style={{ borderColor: 'color-mix(in oklab, var(--primary) 25%, var(--border))' }}
      >
        <MagicWandFilled size={14} className="shrink-0 text-primary" aria-hidden="true" />
        <span className="text-xs">
          AI found{' '}
          <strong>
            {taskCount} task{taskCount === 1 ? '' : 's'}
          </strong>{' '}
          and{' '}
          <strong>
            {controlCount} control{controlCount === 1 ? '' : 's'}
          </strong>
          . Review below.
        </span>
      </div>

      <TasksSection tasks={tasks} checkedTaskIds={checkedTaskIds} onToggle={onToggle} />

      {controls.length > 0 && (
        <ControlsSection
          controls={controls}
          checkedTaskIds={checkedTaskIds}
          derivedControlsCount={derivedControlsCount}
        />
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3.5">
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<MagicWandFilled aria-hidden="true" />}
          onClick={onRerun}
          disabled={submitting}
        >
          Re-run
        </Button>
        <span className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onDiscard}>
          Discard
        </Button>
        <Button
          size="sm"
          onClick={onApply}
          disabled={checkedTaskIds.size === 0 || applying}
          loading={applying}
        >
          Link {checkedTaskIds.size || 'none'}
        </Button>
      </div>
    </div>
  );
}
