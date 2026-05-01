'use client';

import { Impact, Likelihood, RiskTreatmentType, TaskStatus } from '@db';
import { MagicWandFilled } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';
import { AutoLinkButton } from './AutoLinkButton';
import { DescriptionEditor } from './DescriptionEditor';
import { LinkedWork } from './LinkedWork';
import { RelinkButton } from './RelinkButton';
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
  /** Optional auto-link callback. When provided and the entity has zero linked
   * tasks (and the user can update), an Auto-link button is shown above the
   * Linked Work content. Older callers that don't pass this prop keep working. */
  onAutoLink?: () => Promise<{ runId: string; publicAccessToken: string }>;
  /** Optional re-link callback. When provided and the entity has at least one
   * linked task (and the user can update), a "Re-assess" button is shown in
   * the Linked Work section header. The button confirms before running since
   * this is destructive — it wipes the user's manual unlinks. */
  onRelink?: () => Promise<{ runId: string; publicAccessToken: string }>;
  /** Optional unlink callback. When provided, each task row in the Linked Work
   * card gets a × affordance that removes the task↔entity link. */
  onUnlinkTask?: (taskId: string) => Promise<void>;
}

export function TreatmentPlanTab({
  orgId,
  entity,
  canUpdate,
  onUpdateStrategy,
  onUpdateDescription,
  onRegenerate,
  regenerating,
  onAutoLink,
  onRelink,
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

      <div
        className="bg-background grid grid-cols-1 overflow-hidden rounded-md border border-border lg:grid-cols-[1fr_1.2fr_1fr]"
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
            action={
              entity.tasks.length > 0 && canUpdate && onRelink ? (
                <RelinkButton
                  disabled={regenerating}
                  onRelink={onRelink}
                  onAfterLink={onRegenerate}
                />
              ) : undefined
            }
          />
          {entity.tasks.length === 0 && canUpdate && onAutoLink ? (
            <div className="mt-4">
              <AutoLinkButton
                hasDescription={Boolean(description.trim())}
                disabled={regenerating}
                onAutoLink={onAutoLink}
                onAfterLink={onRegenerate}
              />
            </div>
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
