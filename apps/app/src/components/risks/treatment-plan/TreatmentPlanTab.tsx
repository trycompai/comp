'use client';

import { cn } from '@/lib/utils';
import { Impact, Likelihood, RiskTreatmentType, TaskStatus } from '@db';
import { useEffect, useState } from 'react';
import { AutoLinkSuggestions } from './AutoLinkSuggestions';
import { DescriptionEditor } from './DescriptionEditor';
import { LinkedWork } from './LinkedWork';
import { StrategyPicker } from './StrategyPicker';
import { TreatmentHero } from './TreatmentHero';

export interface TreatmentPlanEntity {
  id: string;
  inherentLikelihood: Likelihood;
  inherentImpact: Impact;
  residualLikelihood: Likelihood;
  residualImpact: Impact;
  treatmentStrategy: RiskTreatmentType;
  treatmentStrategyDescription: string | null;
  /**
   * Per-strategy saved descriptions. Lets the UI swap the displayed
   * description instantly when the user picks a different strategy,
   * without waiting for the API to round-trip and the SWR cache to
   * revalidate. Server keeps these in sync; see
   * `apps/api/src/risks/strategy-descriptions.ts`.
   */
  strategyDescriptions?: Partial<Record<RiskTreatmentType, string>> | null;
  tasks: {
    id: string;
    title: string;
    status: TaskStatus;
    controls: { id: string; name: string }[];
  }[];
}

interface TreatmentPlanTabProps {
  orgId: string;
  entity: TreatmentPlanEntity;
  canUpdate: boolean;
  onUpdateStrategy: (strategy: RiskTreatmentType) => Promise<void>;
  onUpdateDescription: (description: string) => Promise<void>;
  onRegenerate: () => Promise<void>;
  regenerating: boolean;
  /**
   * Active trigger.dev run handle for an in-flight regeneration. The
   * description editor subscribes via `useRealtimeRun` to render live
   * progress until the run terminates.
   */
  regenRun?: { runId: string; publicAccessToken: string } | null;
  /** Called when the regeneration run terminates (success or failure). */
  onRegenSettled?: (result: { success: boolean; reason?: string }) => void;
  /**
   * Triggers the AI scan in suggestionsOnly mode and returns a realtime handle.
   * The component reads `run.output.suggestions` once status === COMPLETED.
   * When omitted, the legacy fall-through renders only LinkedWork.
   */
  onSuggest?: () => Promise<{ runId: string; publicAccessToken: string }>;
  /**
   * Persists the user-confirmed selection.
   * `replace: true` for re-assess (sync semantics — connect ONLY these).
   * `replace: false` for fresh suggest (additive).
   */
  onApply?: (params: { taskIds: string[]; replace: boolean }) => Promise<void>;
  /** Optional unlink callback for individual rows in the linked-state list. */
  onUnlinkTask?: (taskId: string) => Promise<void>;
  /**
   * Resume an in-flight or completed-but-unreviewed AI scan. Returns null when
   * no run is persisted server-side. Used to recover progress after a reload.
   */
  onResumeAutoLink?: () => Promise<{ runId: string; publicAccessToken: string } | null>;
  /** Clears the persisted runId server-side (called from Discard). */
  onDiscardAutoLinkRun?: () => Promise<void>;
  /**
   * @deprecated Use `onSuggest` + `onApply` instead. The previous immediate-
   * apply auto-link flow is replaced by review-before-apply.
   */
  onAutoLink?: () => Promise<{ runId: string; publicAccessToken: string }>;
  /**
   * @deprecated Use `onSuggest` + `onApply({ replace: true })` instead.
   */
  onRelink?: () => Promise<{ runId: string; publicAccessToken: string }>;
}

export function TreatmentPlanTab({
  orgId,
  entity,
  canUpdate,
  onUpdateStrategy,
  onUpdateDescription,
  onRegenerate,
  regenerating,
  onSuggest,
  onApply,
  onUnlinkTask,
  onResumeAutoLink,
  onDiscardAutoLinkRun,
  regenRun,
  onRegenSettled,
}: TreatmentPlanTabProps) {
  const [strategy, setStrategy] = useState(entity.treatmentStrategy);

  useEffect(() => {
    setStrategy(entity.treatmentStrategy);
  }, [entity.treatmentStrategy]);

  const handleStrategyChange = async (next: RiskTreatmentType) => {
    setStrategy(next);
    try {
      await onUpdateStrategy(next);
    } catch {
      setStrategy(entity.treatmentStrategy);
    }
  };

  // When the local strategy state matches the persisted strategy on the
  // entity, use the active `treatmentStrategyDescription` (most up-to-date).
  // When it differs (the user just clicked a different strategy and the
  // SWR cache hasn't revalidated yet), fall back to the saved text for
  // that strategy from `strategyDescriptions`. Without this, switching
  // strategies briefly shows the previous strategy's content under the
  // new strategy's heading.
  const description =
    strategy === entity.treatmentStrategy
      ? (entity.treatmentStrategyDescription ?? '')
      : (entity.strategyDescriptions?.[strategy] ?? '');
  const isMitigate = strategy === RiskTreatmentType.mitigate;
  const hasPlan = description.trim().length > 0;
  const hasLinkedWork = entity.tasks.length > 0;
  // Heuristic: tasks were auto-linked during onboarding but the AI plan
  // hasn't filled in yet → mitigation is in flight (or just queued). Show
  // a generating placeholder so the user knows the system is working
  // rather than seeing an unexplained empty editor. Polling refreshes the
  // entity; when description fills in, this condition naturally fails.
  const isAutoMitigationInFlight =
    isMitigate && hasLinkedWork && !hasPlan && !regenRun && !regenerating;

  // While Mitigate has no linked work, render only the kick-off CTA panel —
  // the user picks "Draft plan & suggest links" / "Suggest tasks & controls"
  // or escapes to the editor via "Start from scratch" / "Edit plan manually".
  // The editor only appears once linked work exists OR the user dismissed.
  const [emptyDismissed, setEmptyDismissed] = useState(false);
  useEffect(() => {
    if (hasLinkedWork) setEmptyDismissed(false);
  }, [hasLinkedWork]);

  const showKickoff = isMitigate && !hasLinkedWork && !emptyDismissed;
  const kickoffVariant: 'kickoff' | 'kickoff-with-plan' = hasPlan
    ? 'kickoff-with-plan'
    : 'kickoff';
  const showLinkedWorkColumn = isMitigate && hasLinkedWork;

  // For non-Mitigate strategies the "plan" is just rationale.
  const planTitle = isMitigate ? 'Treatment plan' : 'Rationale';
  const planSubtitle = isMitigate
    ? 'A concrete plan for the strategy above.'
    : 'Document why this strategy is right for this risk.';

  return (
    <div className="flex flex-col gap-6">
      <TreatmentHero
        inherentLikelihood={entity.inherentLikelihood}
        inherentImpact={entity.inherentImpact}
        residualLikelihood={entity.residualLikelihood}
        residualImpact={entity.residualImpact}
        strategy={strategy}
        tasks={entity.tasks}
        isEmpty={isMitigate && !hasPlan && !hasLinkedWork}
      />

      <div
        className={cn(
          'bg-background grid grid-cols-1 overflow-hidden rounded-md border border-border',
          showLinkedWorkColumn ? 'lg:grid-cols-[1fr_1.2fr_1fr]' : 'lg:grid-cols-[1fr_2fr]',
        )}
      >
        {/* 01 · Strategy */}
        <div className="min-w-0 p-6">
          <ColumnHeader
            number="01"
            title="Strategy"
            subtitle="How is this risk being treated?"
          />
          <StrategyPicker
            value={strategy}
            onChange={handleStrategyChange}
            disabled={!canUpdate}
          />
        </div>

        {/* 02 · Kickoff CTA when linked work is empty (covers both "fully
            empty" and "plan exists, no links" cases) — editor stays hidden
            until linked work appears OR the user dismisses. */}
        <div className="min-w-0 border-t border-border p-6 lg:border-l lg:border-t-0">
          {showKickoff && onSuggest && onApply ? (
            <AutoLinkSuggestions
              orgId={orgId}
              tasks={entity.tasks}
              canUpdate={canUpdate}
              onSuggest={onSuggest}
              onApply={onApply}
              onAfterApply={onRegenerate}
              emptyVariant={kickoffVariant}
              onStartFromScratch={() => setEmptyDismissed(true)}
              onResume={onResumeAutoLink}
              onDiscardRun={onDiscardAutoLinkRun}
            />
          ) : isAutoMitigationInFlight ? (
            <>
              <ColumnHeader number="02" title={planTitle} subtitle={planSubtitle} />
              <AutoMitigationPlaceholder />
            </>
          ) : (
            <>
              <ColumnHeader number="02" title={planTitle} subtitle={planSubtitle} />
              <DescriptionEditor
                value={description}
                onSave={onUpdateDescription}
                onRegenerate={onRegenerate}
                regenerating={regenerating}
                disabled={!canUpdate}
                regenRun={regenRun}
                onRegenSettled={onRegenSettled}
              />
            </>
          )}
        </div>

        {/* 03 · Linked work — only when Mitigate already has linked tasks. */}
        {showLinkedWorkColumn && (
          <div className="min-w-0 border-t border-border p-6 lg:border-l lg:border-t-0">
            <ColumnHeader
              number="03"
              title="Linked work"
              subtitle="Drives the residual estimate."
            />
            {onSuggest && onApply ? (
              <AutoLinkSuggestions
                orgId={orgId}
                tasks={entity.tasks}
                canUpdate={canUpdate}
                onSuggest={onSuggest}
                onApply={onApply}
                onAfterApply={onRegenerate}
                onUnlinkTask={onUnlinkTask}
                onResume={onResumeAutoLink}
                onDiscardRun={onDiscardAutoLinkRun}
              />
            ) : (
              <LinkedWork orgId={orgId} tasks={entity.tasks} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AutoMitigationPlaceholder() {
  return (
    <div
      className="mt-4 flex items-start gap-2 rounded-md border border-border bg-primary/[0.04] px-3 py-2.5"
      role="status"
      aria-live="polite"
    >
      <span
        className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <div className="text-[13px] text-foreground">
          AI is preparing your treatment plan…
        </div>
        <div className="mt-0.5 text-[11px] leading-[1.5] text-muted-foreground">
          Linked tasks were just attached during onboarding; the plan should appear in a moment.
          You can keep navigating — we'll refresh this view automatically.
        </div>
      </div>
    </div>
  );
}

interface ColumnHeaderProps {
  number: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}

function ColumnHeader({ number, title, subtitle, action }: ColumnHeaderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[11px] tracking-[0.1em] text-primary">{number}</span>
        <h3 className="text-lg font-normal tracking-[-0.01em]">{title}</h3>
        {action && (
          <>
            <span className="flex-1" />
            {action}
          </>
        )}
      </div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </div>
  );
}
