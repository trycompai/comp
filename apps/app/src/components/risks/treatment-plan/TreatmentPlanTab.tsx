'use client';

import { Impact, Likelihood, RiskTreatmentType, TaskStatus } from '@db';
import { MagicWandFilled } from '@trycompai/design-system/icons';
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

  return (
    <div className="flex flex-col gap-6">
      <TreatmentHero
        inherentLikelihood={entity.inherentLikelihood}
        inherentImpact={entity.inherentImpact}
        residualLikelihood={entity.residualLikelihood}
        residualImpact={entity.residualImpact}
        strategy={strategy}
        tasks={entity.tasks}
      />

      <div className="bg-background grid grid-cols-1 overflow-hidden rounded-md border border-border lg:grid-cols-[1fr_1.2fr_1fr]">
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

        {/* 02 · Treatment plan */}
        <div className="min-w-0 border-t border-border p-6 lg:border-l lg:border-t-0">
          <ColumnHeader
            number="02"
            title="Treatment plan"
            subtitle="A concrete plan for the strategy above."
            action={
              <button
                type="button"
                onClick={() => {
                  void onRegenerate();
                }}
                disabled={!canUpdate || regenerating}
                className="inline-flex h-[26px] items-center gap-1.5 rounded-md border border-transparent bg-transparent px-2 text-xs text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MagicWandFilled size={12} aria-hidden="true" />
                AI draft
              </button>
            }
          />
          <DescriptionEditor
            value={description}
            onSave={onUpdateDescription}
            onRegenerate={onRegenerate}
            regenerating={regenerating}
            disabled={!canUpdate}
          />
        </div>

        {/* 03 · Linked work */}
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
            <LinkedWork
              orgId={orgId}
              tasks={entity.tasks}
              onUnlinkTask={canUpdate ? onUnlinkTask : undefined}
            />
          )}
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
