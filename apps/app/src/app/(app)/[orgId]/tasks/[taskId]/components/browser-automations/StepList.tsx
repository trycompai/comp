'use client';

import { Checkmark, Close } from '@trycompai/design-system/icons';

export type SignInStepState = 'done' | 'active' | 'pending' | 'warn' | 'fail';

export interface SignInStep {
  /** Step label. */
  l: string;
  /** Timestamp (e.g. "06:02:14"). */
  t?: string;
  state: SignInStepState;
}

function StepIcon({ state }: { state: SignInStepState }) {
  if (state === 'done') {
    return (
      <span
        className="mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full"
        style={{
          background: 'color-mix(in oklab, var(--success) 14%, transparent)',
          color: 'var(--success)',
        }}
      >
        <Checkmark size={9} />
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span className="mt-px grid h-4 w-4 shrink-0 place-items-center">
        <span className="h-[11px] w-[11px] animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </span>
    );
  }
  if (state === 'warn') {
    return (
      <span
        className="mt-px grid h-4 w-4 shrink-0 animate-pulse place-items-center rounded-full text-[10px] font-bold"
        style={{
          background: 'color-mix(in oklab, var(--warning) 22%, transparent)',
          color: 'oklch(0.5 0.14 85)',
        }}
      >
        !
      </span>
    );
  }
  if (state === 'fail') {
    return (
      <span
        className="mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full text-destructive"
        style={{ background: 'color-mix(in oklab, var(--destructive) 12%, transparent)' }}
      >
        <Close size={8} />
      </span>
    );
  }
  return (
    <span className="mt-px grid h-4 w-4 shrink-0 place-items-center">
      <span className="h-1.5 w-1.5 rounded-full bg-border" />
    </span>
  );
}

/** A vertical activity timeline — what the AI is doing during sign-in / a run. */
export function StepList({ steps }: { steps: SignInStep[] }) {
  return (
    <div className="flex flex-col">
      {steps.map((step, index) => (
        <div key={`${index}-${step.l}`} className="flex items-start gap-2.5 py-1.5">
          <StepIcon state={step.state} />
          <div className="min-w-0 flex-1 text-xs leading-snug text-foreground">{step.l}</div>
          {step.t && (
            <span className="mt-0.5 shrink-0 font-mono text-[10px] text-muted-foreground">
              {step.t}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
