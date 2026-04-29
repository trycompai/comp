'use client';

import { Button } from '@trycompai/design-system';
import {
  Link,
  Settings,
  Rocket,
} from '@trycompai/design-system/icons';

interface EmptyStateProps {
  onCreateClick: () => void;
  /** Spendable balance — when 0 the CTA is disabled. */
  balance?: number;
  /** True if the trial has already been used (paid plans coming soon copy). */
  trialUsed?: boolean;
}

const STEPS = [
  {
    title: 'Connect target',
    description:
      'Point the scanner at a URL you own. HTTPS required.',
    Icon: Link,
  },
  {
    title: 'Configure scope',
    description:
      'Optionally attach a public repository for deeper, code-aware coverage.',
    Icon: Settings,
  },
  {
    title: 'Scan runs automatically',
    description:
      'Specialist agents probe the target for 1–3 hours and return a compliance-grade report.',
    Icon: Rocket,
  },
];

export function EmptyState({
  onCreateClick,
  balance,
  trialUsed,
}: EmptyStateProps) {
  const canCreate = balance === undefined ? true : balance > 0;
  const tagline = trialUsed
    ? "You've used your trial run. Paid plans are coming soon — contact support if you need access today."
    : 'Automated black-box pen testing. Start a scan to see findings here.';
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col items-start justify-center gap-6 px-8 py-12">
      <div>
        <div className="mb-3 inline-flex items-center gap-2">
          <h1 className="text-[26px] font-medium tracking-[-0.02em]">
            Penetration Tests
          </h1>
          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            New
          </span>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">{tagline}</p>
      </div>

      <Button onClick={onCreateClick} disabled={!canCreate}>
        + New Scan
      </Button>

      <div className="w-full rounded-[var(--radius)] border border-border bg-background">
        <div className="border-b border-border px-5 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            How it works
          </p>
        </div>
        <ol className="divide-y divide-border">
          {STEPS.map((step, i) => {
            const { Icon } = step;
            return (
              <li
                key={step.title}
                className="flex items-start gap-4 px-5 py-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-mono text-[11px] text-muted-foreground">
                  {i + 1}
                </span>
                <Icon className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {step.description}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
