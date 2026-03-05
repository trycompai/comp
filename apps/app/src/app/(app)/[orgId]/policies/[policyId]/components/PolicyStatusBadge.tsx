'use client';

import { getStatusTranslation, type StatusType } from '@/components/status-indicator';
import { Badge } from '@comp/ui/badge';
import type { PolicyStatus } from '@db';

interface PolicyStatusBadgeProps {
  status: PolicyStatus;
  isArchived?: boolean;
}

export function PolicyStatusBadge({ status, isArchived }: PolicyStatusBadgeProps) {
  if (isArchived) {
    return (
      <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted">
        Archived
      </Badge>
    );
  }

  const statusLabel = getStatusTranslation(status as StatusType);

  const getBadgeProps = () => {
    switch (status) {
      case 'published':
        return {
          variant: 'secondary' as const,
          className: 'bg-primary/10 text-primary hover:bg-primary/10',
        };
      case 'draft':
        return {
          variant: 'secondary' as const,
          className: 'border-warning/30 bg-warning/10 text-warning hover:bg-warning/10',
        };
      case 'needs_review':
        return {
          variant: 'outline' as const,
          className: 'border-warning text-warning',
        };
      default:
        return {
          variant: 'secondary' as const,
          className: '',
        };
    }
  };

  const badgeProps = getBadgeProps();

  return (
    <Badge variant={badgeProps.variant} className={badgeProps.className}>
      {statusLabel}
    </Badge>
  );
}
