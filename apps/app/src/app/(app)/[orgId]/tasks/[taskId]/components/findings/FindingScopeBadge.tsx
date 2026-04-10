'use client';

import { FINDING_SCOPE_LABELS } from '@/hooks/use-findings-api';
import { Badge } from '@trycompai/ui/badge';
import { FindingScope } from '@db';
import { cn } from '@/lib/utils';

const SCOPE_BADGE_CLASS = 'text-xs';

interface FindingScopeBadgeProps {
  scope: FindingScope;
  className?: string;
}

export function FindingScopeBadge({ scope, className }: FindingScopeBadgeProps) {
  return (
    <Badge variant="outline" className={cn(SCOPE_BADGE_CLASS, className)}>
      {FINDING_SCOPE_LABELS[scope]}
    </Badge>
  );
}
