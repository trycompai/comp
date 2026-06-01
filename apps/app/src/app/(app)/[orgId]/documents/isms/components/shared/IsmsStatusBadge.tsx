import { Badge, badgeVariants, cn } from '@trycompai/design-system';
import {
  CheckmarkFilled,
  CircleDash,
  Edit,
  Misuse,
  Time,
  WarningAltFilled,
} from '@trycompai/design-system/icons';
import type { ComponentType } from 'react';
import type { IsmsDocumentStatus } from '../../isms-types';

/**
 * The single status vocabulary for the entire ISMS area. Every document,
 * register, and the Statement of Applicability MUST render status through
 * this component so the colour language is identical everywhere.
 */
export type IsmsDisplayStatus =
  | 'not_started'
  | 'draft'
  | 'pending'
  | 'approved'
  | 'declined';

type BadgeVariant = 'secondary' | 'accent' | 'destructive';

interface StatusConfig {
  label: string;
  icon: ComponentType<{ size?: number }>;
  variant: BadgeVariant;
}

/**
 * Maps display statuses to DS Badge variants. Approved uses `accent` (the
 * brand/primary tint), Declined uses `destructive`, everything neutral uses
 * `secondary`. Pending is amber and has no Badge variant, so it is handled by
 * the dedicated amber wrapper below — never with an ad-hoc coloured span.
 */
const STATUS_CONFIG: Record<Exclude<IsmsDisplayStatus, 'pending'>, StatusConfig> = {
  not_started: { label: 'Not started', icon: CircleDash, variant: 'secondary' },
  draft: { label: 'Draft', icon: Edit, variant: 'secondary' },
  approved: { label: 'Approved', icon: CheckmarkFilled, variant: 'accent' },
  declined: { label: 'Declined', icon: Misuse, variant: 'destructive' },
};

/** Normalise the API status enum to the shared display vocabulary. */
export function toDisplayStatus(status: IsmsDocumentStatus | null): IsmsDisplayStatus {
  if (!status) return 'not_started';
  if (status === 'approved') return 'approved';
  if (status === 'declined') return 'declined';
  if (status === 'needs_review' || status === 'in_progress') return 'pending';
  return 'draft';
}

/**
 * Shared amber pill for states that have no DS Badge variant (Pending,
 * Needs review). Geometry is sourced directly from the DS `badgeVariants`
 * (size="default") so it stays pixel-identical to a real `<Badge>`; only the
 * amber semantic `--warning` colour is layered on top (dark-mode-aware via the
 * theme). Defined ONCE, here only, so no ad-hoc amber spans get scattered.
 */
function AmberBadge({
  label,
  icon: Icon,
}: {
  label: string;
  icon: ComponentType<{ size?: number }>;
}) {
  return (
    <span
      className={cn(
        badgeVariants({ variant: 'outline', shape: 'default', size: 'default' }),
        'border-warning/20 bg-warning/10 text-warning',
      )}
    >
      <Icon size={10} />
      {label}
    </span>
  );
}

export interface IsmsStatusBadgeProps {
  status: IsmsDocumentStatus | null;
  /** When true, appends a "Needs review" drift indicator after the status. */
  isStale?: boolean;
}

function StatusPill({ display }: { display: IsmsDisplayStatus }) {
  if (display === 'pending') {
    return <AmberBadge label="Pending approval" icon={Time} />;
  }
  const { label, icon: Icon, variant } = STATUS_CONFIG[display];
  return (
    <Badge variant={variant}>
      <Icon size={10} />
      {label}
    </Badge>
  );
}

/** The ONE status component for the ISMS area. */
export function IsmsStatusBadge({ status, isStale }: IsmsStatusBadgeProps) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <StatusPill display={toDisplayStatus(status)} />
      {isStale && <AmberBadge label="Needs review" icon={WarningAltFilled} />}
    </span>
  );
}

/** Bare drift indicator, for places that show drift without a status. */
export function IsmsDriftBadge() {
  return <AmberBadge label="Needs review" icon={WarningAltFilled} />;
}
