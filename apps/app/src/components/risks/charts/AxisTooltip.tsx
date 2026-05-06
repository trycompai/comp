'use client';

// TODO(design-system): migrate to @trycompai/design-system when Tooltip ships.
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@trycompai/ui/tooltip';
import type { ReactNode } from 'react';

interface AxisTooltipProps {
  label: ReactNode;
  definition: string;
}

/**
 * Wraps an axis tier label (or info icon) with a hover definition,
 * e.g. "Insignificant: no material impact on operations, customers, or compliance."
 */
export function AxisTooltip({ label, definition }: AxisTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help underline decoration-dotted underline-offset-2">
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent>{definition}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
