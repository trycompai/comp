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

  const description = entity.treatmentStrategyDescription ?? '';
  const isMitigate = strategy === RiskTreatmentType.mitigate;
  const hasPlan = description.trim().length > 0;
  const hasLinkedWork = entity.tasks.length > 0;
  // When Mitigate has neither plan nor linked tasks, merge cols 02+03 into a
  // single empty-state CTA — there's nothing to mitigate against yet.
  const isMitigateEmpty = isMitigate && !hasPlan && !hasLinkedWork;
  const showLinkedWorkColumn = isMitigate && !isMitigateEmpty;

  // For non-Mitigate strategies the "plan" is just rationale — there's no
  // linked work to track because the score doesn't drive off task completion.
  const planTitle = isMitigateEmpty
    ? 'Mitigation plan'
    : isMitigate
      ? 'Treatment plan'
      : 'Rationale';
  const planSubtitle = isMitigateEmpty
    ? 'Create a plan and link the tasks and controls that will mitigate this risk.'
    : isMitigate
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
        isEmpty={isMitigateEmpty}
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

        {/* 02 · Treatment plan / Rationale / merged Mitigation plan empty state */}
        <div className="min-w-0 border-t border-border p-6 lg:border-l lg:border-t-0">
          <ColumnHeader number="02" title={planTitle} subtitle={planSubtitle} />
          {isMitigateEmpty && onSuggest && onApply ? (
            <AutoLinkSuggestions
              orgId={orgId}
              tasks={entity.tasks}
              canUpdate={canUpdate}
              onSuggest={onSuggest}
              onApply={onApply}
              onAfterApply={onRegenerate}
              emptyVariant="plan"
            />
          ) : (
            <DescriptionEditor
              value={description}
              onSave={onUpdateDescription}
              onRegenerate={onRegenerate}
              regenerating={regenerating}
              disabled={!canUpdate}
            />
          )}
        </div>

        {/* 03 · Linked work — only when Mitigate is in progress (some plan or
            linked tasks already exist). The fully-empty Mitigate state lives
            in the merged 02 column above. */}
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
