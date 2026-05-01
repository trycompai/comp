'use client';

import { MagicWandFilled } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { LinkedWork } from './LinkedWork';
import {
  EmptyState,
  FailedState,
  LoadingState,
  SuggestionsState,
} from './AutoLinkSuggestions.parts';
import type {
  LinkedTask,
  Mode,
  State,
  SuggestedControl,
  SuggestedTask,
} from './AutoLinkSuggestions.types';

export type {
  SuggestedTask,
  SuggestedControl,
  LinkedTask,
} from './AutoLinkSuggestions.types';

export interface AutoLinkSuggestionsProps {
  orgId: string;
  /** Existing linked tasks (rendered in `linked` state via <LinkedWork>). */
  tasks: LinkedTask[];
  canUpdate: boolean;
  /** Triggers the AI scan; returns a runId + token for realtime subscription. */
  onSuggest: () => Promise<{ runId: string; publicAccessToken: string }>;
  /** Persists the user-confirmed selection. `replace` is true for re-assess. */
  onApply: (params: { taskIds: string[]; replace: boolean }) => Promise<void>;
  /** Called after apply succeeds — typically the parent's onRegenerate. */
  onAfterApply?: () => Promise<void>;
  /** Per-task unlink, plumbed through to <LinkedWork> in linked state. */
  onUnlinkTask?: (taskId: string) => Promise<void>;
  /**
   * `'kickoff'` — wide panel for the truly-fresh case.
   * `'kickoff-with-plan'` — wide panel with copy adapted to "AI will only
   *   suggest tasks/controls; your plan stays".
   * `'default'` — small per-column CTA (currently unused).
   */
  emptyVariant?: 'default' | 'kickoff' | 'kickoff-with-plan';
  /** Called when the user clicks "Start from scratch" in the kickoff panel.
   *  Parent should dismiss the kickoff state so the editor renders. */
  onStartFromScratch?: () => void;
  /**
   * Resumes an in-flight or completed-but-unreviewed AI scan after a page
   * reload. Parent fetches `GET /auto-link/active`. When this returns a run,
   * the component jumps straight into the loading state and re-subscribes to
   * the trigger.dev run via `useRealtimeRun`.
   */
  onResume?: () => Promise<{ runId: string; publicAccessToken: string } | null>;
  /**
   * Clears the persisted runId server-side. Called when the user clicks
   * Discard so the next reload doesn't re-resume a discarded run.
   */
  onDiscardRun?: () => Promise<void>;
}

export function AutoLinkSuggestions({
  orgId,
  tasks,
  canUpdate,
  onSuggest,
  onApply,
  onAfterApply,
  onUnlinkTask,
  emptyVariant = 'default',
  onStartFromScratch,
  onResume,
  onDiscardRun,
}: AutoLinkSuggestionsProps) {
  const [state, setState] = useState<State>(() =>
    tasks.length > 0 ? { kind: 'linked' } : { kind: 'empty' },
  );
  const [submitting, setSubmitting] = useState(false);
  const [applying, setApplying] = useState(false);

  // Keep linked/empty state in sync with parent task list. Don't override
  // mid-flow loading/suggestions/failed states.
  useEffect(() => {
    setState((prev) => {
      if (prev.kind === 'linked' || prev.kind === 'empty') {
        return tasks.length > 0 ? { kind: 'linked' } : { kind: 'empty' };
      }
      return prev;
    });
  }, [tasks.length]);

  // On mount, if a run is already in flight (or completed-but-unreviewed) on
  // the server, jump straight to the loading state and re-subscribe. Mode is
  // unknown after a reload; default 'fresh' so apply stays additive (no
  // accidental destructive replace on user side).
  useEffect(() => {
    if (!onResume) return;
    let cancelled = false;
    void onResume().then((active) => {
      if (cancelled || !active) return;
      setState({
        kind: 'loading',
        runId: active.runId,
        publicAccessToken: active.publicAccessToken,
        mode: 'fresh',
      });
    });
    return () => {
      cancelled = true;
    };
  }, [onResume]);

  const handleSuggest = async (mode: Mode) => {
    setSubmitting(true);
    try {
      const { runId, publicAccessToken } = await onSuggest();
      setState({ kind: 'loading', runId, publicAccessToken, mode });
    } catch {
      toast.error('Suggest failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuggestionsReady = (suggestions: {
    tasks: SuggestedTask[];
    controls: SuggestedControl[];
  }) => {
    setState((prev) => {
      const mode: Mode = prev.kind === 'loading' ? prev.mode : 'fresh';
      const checked = new Set<string>(suggestions.tasks.map((t) => t.id));
      const merged: SuggestedTask[] = [...suggestions.tasks];
      if (mode === 'reassess') {
        for (const t of tasks) checked.add(t.id);
        const seen = new Set(suggestions.tasks.map((t) => t.id));
        for (const t of tasks) {
          if (seen.has(t.id)) continue;
          merged.push({ id: t.id, title: t.title, status: t.status, score: 0 });
        }
      }
      return {
        kind: 'suggestions',
        mode,
        tasks: merged,
        controls: suggestions.controls,
        checkedTaskIds: checked,
      };
    });
  };

  const handleSuggestionsFailed = (reason: string) => {
    setState((prev) => ({
      kind: 'failed',
      reason,
      mode: prev.kind === 'loading' ? prev.mode : 'fresh',
    }));
  };

  const handleToggleTask = (id: string) => {
    setState((prev) => {
      if (prev.kind !== 'suggestions') return prev;
      const next = new Set(prev.checkedTaskIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, checkedTaskIds: next };
    });
  };

  const handleDiscard = () => {
    if (onDiscardRun) {
      void onDiscardRun();
    }
    setState(tasks.length > 0 ? { kind: 'linked' } : { kind: 'empty' });
  };

  const handleApply = async () => {
    if (state.kind !== 'suggestions') return;
    setApplying(true);
    try {
      const taskIds = [...state.checkedTaskIds];
      await onApply({ taskIds, replace: state.mode === 'reassess' });
      if (onAfterApply) {
        try {
          await onAfterApply();
        } catch {
          /* parent surfaces its own errors */
        }
      }
      toast.success(`Linked ${taskIds.length} task${taskIds.length === 1 ? '' : 's'}`);
      setState(taskIds.length > 0 ? { kind: 'linked' } : { kind: 'empty' });
    } catch {
      toast.error('Failed to apply suggestions.');
    } finally {
      setApplying(false);
    }
  };

  const handleRerun = () => {
    if (state.kind !== 'suggestions') return;
    void handleSuggest(state.mode);
  };

  if (state.kind === 'empty') {
    return (
      <EmptyState
        canUpdate={canUpdate}
        submitting={submitting}
        onSuggest={() => void handleSuggest('fresh')}
        onStartFromScratch={onStartFromScratch}
        variant={emptyVariant}
      />
    );
  }

  if (state.kind === 'loading') {
    return (
      <LoadingState
        runId={state.runId}
        accessToken={state.publicAccessToken}
        onReady={handleSuggestionsReady}
        onFailed={handleSuggestionsFailed}
      />
    );
  }

  if (state.kind === 'suggestions') {
    return (
      <SuggestionsState
        tasks={state.tasks}
        controls={state.controls}
        checkedTaskIds={state.checkedTaskIds}
        applying={applying}
        submitting={submitting}
        onToggle={handleToggleTask}
        onDiscard={handleDiscard}
        onApply={() => void handleApply()}
        onRerun={handleRerun}
      />
    );
  }

  if (state.kind === 'failed') {
    return (
      <FailedState
        reason={state.reason}
        retrying={submitting}
        onRetry={() => void handleSuggest(state.mode)}
        onDiscard={handleDiscard}
      />
    );
  }

  // linked
  return (
    <div>
      {canUpdate && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSuggest('reassess')}
            disabled={submitting}
            title="Re-assess all linked tasks and controls with AI"
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <MagicWandFilled size={11} aria-hidden="true" />
            <span>Re-assess</span>
          </button>
        </div>
      )}
      <LinkedWork orgId={orgId} tasks={tasks} />
    </div>
  );
}
