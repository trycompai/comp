'use client';

import { Button, Textarea } from '@trycompai/design-system';
import { ChevronDown, ChevronUp, Renew, TrashCan } from '@trycompai/design-system/icons';
import type { BrowserAuthProfileStatus } from '../../hooks/types';
import { ConnectionPicker } from './ConnectionPicker';
import type { ConnectionRef, EditableStep } from './InstructionComposer';

interface StepCardProps {
  step: EditableStep;
  index: number;
  total: number;
  isActive: boolean;
  connections: ConnectionRef[];
  connection?: ConnectionRef;
  onActivate: () => void;
  onChange: (patch: Partial<EditableStep>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  onReconnect: (connection: ConnectionRef) => void;
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-muted text-[10px] font-bold text-foreground">
      {n}
    </span>
  );
}

const NEEDS_FIX = (status?: BrowserAuthProfileStatus) =>
  status === 'needs_reauth' || status === 'blocked' || status === 'unverified';

export function StepCard({
  step,
  index,
  total,
  isActive,
  connections,
  connection,
  onActivate,
  onChange,
  onRemove,
  onMove,
  onReconnect,
}: StepCardProps) {
  const needsFix = NEEDS_FIX(connection?.status);

  if (!isActive) {
    return (
      <button
        type="button"
        onClick={onActivate}
        className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-foreground/30"
      >
        <StepNumber n={index + 1} />
        <span className="truncate text-[11.5px] font-medium text-muted-foreground">
          {connection?.hostname ?? 'No connection'}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">
          {step.instruction.trim() || 'Untitled step'}
        </span>
        {step.criteria.trim() && (
          <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Check
          </span>
        )}
        {needsFix && (
          <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: 'var(--warning)' }} />
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-primary/40 bg-background p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <StepNumber n={index + 1} />
          <span className="shrink-0 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Runs on
          </span>
          <div className="min-w-0 flex-1">
            <ConnectionPicker
              connections={connections}
              value={step.profileId}
              onChange={(profileId) => onChange({ profileId })}
            />
          </div>
        </div>
        {/* Reorder / remove only make sense with more than one step. */}
        {total > 1 && (
          <div className="flex flex-none items-center gap-0.5">
            <button
              type="button"
              aria-label="Move up"
              disabled={index === 0}
              onClick={() => onMove(-1)}
              className="grid h-6 w-6 cursor-pointer place-items-center rounded-sm text-muted-foreground hover:text-foreground disabled:cursor-default disabled:opacity-30"
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              aria-label="Move down"
              disabled={index === total - 1}
              onClick={() => onMove(1)}
              className="grid h-6 w-6 cursor-pointer place-items-center rounded-sm text-muted-foreground hover:text-foreground disabled:cursor-default disabled:opacity-30"
            >
              <ChevronDown size={14} />
            </button>
            <button
              type="button"
              aria-label="Remove step"
              onClick={onRemove}
              className="grid h-6 w-6 cursor-pointer place-items-center rounded-sm text-muted-foreground hover:text-destructive"
            >
              <TrashCan size={13} />
            </button>
          </div>
        )}
      </div>

      {needsFix && connection && (
        <div
          className="flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-[11.5px]"
          style={{
            border: '1px solid color-mix(in oklab, var(--warning) 45%, transparent)',
            background: 'color-mix(in oklab, var(--warning) 10%, transparent)',
          }}
        >
          <span className="text-foreground">
            {connection.hostname} needs reconnect — this step can’t run until it’s fixed.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReconnect(connection)}
            iconLeft={<Renew size={12} />}
          >
            Reconnect
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`step-instruction-${step.key}`}
          className="text-[13px] font-medium text-foreground"
        >
          What should the AI capture?
        </label>
        <div className="[&_textarea]:text-[13px] [&_textarea]:leading-relaxed">
          <Textarea
            id={`step-instruction-${step.key}`}
            value={step.instruction}
            onChange={(event) => onChange({ instruction: event.target.value })}
            placeholder="Go to Settings → Security and screenshot the two-factor authentication policy."
            rows={3}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <label
            htmlFor={`step-check-${step.key}`}
            className="text-[13px] font-medium text-foreground"
          >
            Pass / fail check
          </label>
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            optional
          </span>
        </div>
        <div className="[&_textarea]:text-[13px] [&_textarea]:leading-relaxed">
          <Textarea
            id={`step-check-${step.key}`}
            value={step.criteria}
            onChange={(event) => onChange({ criteria: event.target.value })}
            placeholder="Two-factor authentication is enforced for all members."
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}
