import type { ReactNode } from 'react';
import { LockPill } from './LockPill';

interface MarketingHeaderProps {
  /** Small "Add-on" / "Beta" / etc. lock pill on the top row. Optional. */
  lockLabel?: string;
  /** Muted mono status line next to the pill, e.g. "No active plan". Optional. */
  statusText?: string;
  /** Page h1. */
  title: string;
  /** Muted description paragraph below the title. */
  description: string;
  /** Right-aligned action row — usually one or two Buttons. */
  actions?: ReactNode;
}

export function MarketingHeader({
  lockLabel,
  statusText,
  title,
  description,
  actions,
}: MarketingHeaderProps) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {(lockLabel || statusText) && (
          <div className="mb-2 flex items-center gap-2">
            {lockLabel && <LockPill label={lockLabel} />}
            {statusText && (
              <span className="font-mono text-[12px] text-muted-foreground">
                {statusText}
              </span>
            )}
          </div>
        )}
        <h1 className="text-[24px] font-normal leading-[1.1] tracking-[-0.018em] sm:text-[28px] lg:text-[32px]">
          {title}
        </h1>
        <p className="mt-2 max-w-[560px] text-[13px] leading-[1.55] text-muted-foreground sm:text-sm">
          {description}
        </p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
