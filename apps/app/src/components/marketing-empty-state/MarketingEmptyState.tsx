import type { ReactNode } from 'react';

interface MarketingEmptyStateProps {
  children: ReactNode;
}

/**
 * Universal container for marketing/upsell empty states. Vertical stack with
 * the page padding + section gap shared across every feature that adopts the
 * pattern. Content is intentionally slot-based — this component knows nothing
 * about plans, scans, or any feature-specific gating. Each feature renders it
 * conditionally based on its own `isMarketingStateEnabled` boolean.
 */
export function MarketingEmptyState({ children }: MarketingEmptyStateProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-5 sm:gap-7 sm:px-6 sm:py-6 lg:gap-8 lg:px-7">
        {children}
      </div>
    </div>
  );
}
