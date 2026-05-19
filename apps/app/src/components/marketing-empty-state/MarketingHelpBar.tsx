import { Help } from '@trycompai/design-system/icons';
import type { ReactNode } from 'react';

interface MarketingHelpBarProps {
  title: string;
  body: string;
  /** Right-aligned action row, usually one or two Buttons. */
  actions?: ReactNode;
}

export function MarketingHelpBar({ title, body, actions }: MarketingHelpBarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-md border border-border bg-background p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/14 text-primary">
        <Help size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px]">{title}</div>
        <div className="text-[12px] leading-[1.4] text-muted-foreground">{body}</div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
