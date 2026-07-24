'use client';

import { Button } from '@trycompai/design-system';

const STEPS = [
  {
    n: 'Step 1',
    title: 'Connect once',
    desc: 'Sign in to the vendor a single time. Comp AI saves the session and re-logs in on its own.',
  },
  {
    n: 'Step 2',
    title: 'Add instructions',
    desc: 'Plain English — “screenshot the MFA policy”. Test once, watch the AI, refine, save.',
  },
  {
    n: 'Step 3',
    title: 'Evidence lands here',
    desc: 'Runs happen on this task’s schedule with no one watching. Screenshots and pass/fail verdicts collect below.',
  },
];

interface BrowserEvidenceEmptyStateProps {
  isStartingAuth: boolean;
  onConnect: () => void;
}

/** The "not set up" state for a task's browser evidence (design 1n). */
export function BrowserEvidenceEmptyState({
  isStartingAuth,
  onConnect,
}: BrowserEvidenceEmptyStateProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span className="text-lg font-medium tracking-tight text-foreground">
            Browser evidence
          </span>
          <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Not set up
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Comp AI signs in to your vendors and captures screenshots as evidence — on a
          schedule, unattended.
        </p>
      </div>

      <div className="p-6">
        <div className="mb-5 grid grid-cols-1 overflow-hidden rounded-md border border-border sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div
              key={step.n}
              className={
                index < STEPS.length - 1
                  ? 'border-b border-border p-4 sm:border-b-0 sm:border-r'
                  : 'p-4'
              }
            >
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                {step.n}
              </div>
              <div className="mb-1 text-sm text-foreground">{step.title}</div>
              <div className="text-xs leading-relaxed text-muted-foreground">
                {step.desc}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onConnect} loading={isStartingAuth} disabled={isStartingAuth}>
            Connect a vendor login
          </Button>
          <span className="text-xs text-muted-foreground">
            Takes about a minute — you&apos;ll watch the AI sign in.
          </span>
        </div>
      </div>
    </div>
  );
}
