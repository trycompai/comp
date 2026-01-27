'use client';

import { Badge } from '@comp/ui/badge';
import { FindingStatus } from '@db';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<
  FindingStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }
> = {
  open: {
    label: 'Open',
    variant: 'destructive',
    className: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100',
  },
  ready_for_review: {
    label: 'Ready for Review',
    variant: 'secondary',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
  },
  needs_revision: {
    label: 'Needs Revision',
    variant: 'secondary',
    className: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100',
  },
  closed: {
    label: 'Closed',
    variant: 'default',
    className: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/10',
  },
};

interface FindingStatusBadgeProps {
  status: FindingStatus;
  className?: string;
}

export function FindingStatusBadge({ status, className }: FindingStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
