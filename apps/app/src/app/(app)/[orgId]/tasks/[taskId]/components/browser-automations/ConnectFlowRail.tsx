'use client';

import { Checkmark } from '@trycompai/design-system/icons';

const RAIL_STEPS = ['Vendor site', 'Check', 'Sign in', 'Details', 'Done'];

interface ConnectFlowRailProps {
  title: string;
  subtitle: string;
  /** Index of the current rail step (0–4); steps before it render as done. */
  currentIndex: number;
  allDone?: boolean;
  detecting?: boolean;
  /**
   * Show the "what we detect" panel. Only relevant before the user picks a
   * method — once the chooser lists the methods, repeating them here is
   * redundant, so the flow turns this off.
   */
  showDetectPanel?: boolean;
}

export function ConnectFlowRail({
  title,
  subtitle,
  currentIndex,
  allDone = false,
  detecting = false,
  showDetectPanel = false,
}: ConnectFlowRailProps) {
  return (
    <div className="flex flex-col gap-5 border-b border-border bg-muted p-5 sm:border-b-0 sm:border-r">
      <div className="flex flex-col gap-0.5">
        <div className="text-sm text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>

      <div className="flex flex-col gap-2.5">
        {RAIL_STEPS.map((label, index) => {
          const done = allDone || index < currentIndex;
          const current = !allDone && index === currentIndex;
          return (
            <div key={label} className="flex items-center gap-2">
              {done ? (
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Checkmark size={9} />
                </span>
              ) : (
                <span
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border-[1.5px] ${
                    current ? 'border-primary' : 'border-border'
                  }`}
                >
                  {current && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </span>
              )}
              <span
                className={`text-xs ${done || current ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {showDetectPanel && (
        <div className="mt-auto flex flex-col gap-2 rounded-md border border-border bg-background p-2.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            What we detect appears here
          </span>
          {detecting && (
            <>
              <div className="h-2 w-4/5 animate-pulse rounded bg-accent" />
              <div className="h-2 w-3/5 animate-pulse rounded bg-accent" />
            </>
          )}
        </div>
      )}
    </div>
  );
}
