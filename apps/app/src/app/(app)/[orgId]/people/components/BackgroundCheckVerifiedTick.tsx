'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@trycompai/design-system';
import { Security } from '@trycompai/design-system/icons';

const TOOLTIP_LABEL = 'Employee has completed a background check';

export function BackgroundCheckVerifiedTick({
  size = 14,
  lift = false,
}: {
  size?: number;
  lift?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger aria-label={TOOLTIP_LABEL}>
        <span
          className={`inline-flex shrink-0 items-center text-primary ${
            lift ? 'translate-y-1' : 'translate-y-px'
          }`}
        >
          <Security size={size} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{TOOLTIP_LABEL}</TooltipContent>
    </Tooltip>
  );
}
