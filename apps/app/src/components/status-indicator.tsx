import { cn } from '@trycompai/ui/cn';

// Consolidated status types from Prisma schema
export const STATUS_TYPES = [
  // Common
  'draft',
  'published',
  'archived',
  'in_progress',

  // Policy
  'needs_review',

  // Risk
  'open',
  'pending',
  'closed',

  // Control
  'not_started',
  'completed',

  // Task
  'todo',
  'in_review',
  'done',
  'not_relevant',
  'failed',
] as const;

export type StatusType = (typeof STATUS_TYPES)[number];

// STATUS_COLORS using design system tokens
export const STATUS_COLORS: Record<StatusType, string> = {
  // Positive - Primary
  published: 'bg-primary',
  completed: 'bg-primary',
  done: 'bg-primary',
  closed: 'bg-primary',

  // Active - Info
  open: 'bg-info',

  // Neutral - Muted
  archived: 'bg-muted-foreground',
  todo: 'bg-muted-foreground',

  // In Progress - Warning
  draft: 'bg-warning',
  pending: 'bg-warning',
  in_progress: 'bg-warning',

  // In Review - Warning/Destructive mix
  in_review: 'bg-warning',

  // Error - Destructive
  needs_review: 'bg-destructive',
  not_started: 'bg-destructive',
  not_relevant: 'bg-destructive',
  failed: 'bg-destructive',
} as const;

// Updated status translation mapping
export const getStatusTranslation = (status: StatusType) => {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'todo':
      return 'Todo';
    case 'in_progress':
      return 'In Progress';
    case 'in_review':
      return 'In Review';
    case 'done':
      return 'Done';
    case 'published':
      return 'Published';
    case 'archived':
      return 'Archived';
    case 'needs_review':
      return 'Needs Review';
    case 'open':
      return 'Open';
    case 'pending':
      return 'Pending';
    case 'closed':
      return 'Closed';

    default: {
      // Fallback for unmapped statuses
      // Cast status to string to handle potential 'never' type inferred by TS
      const statusString = status as string;
      const fallback = statusString.replace(/_/g, ' ');
      return fallback.charAt(0).toUpperCase() + fallback.slice(1);
    }
  }
};

interface StatusIndicatorProps {
  status: StatusType | null | undefined; // Allow null/undefined
  className?: string;
  withLabel?: boolean;
}

export function StatusIndicator({ status, className, withLabel = true }: StatusIndicatorProps) {
  // Handle null or undefined status
  if (!status) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="size-2.5 bg-gray-400 dark:bg-gray-500 rounded-full" />
        {withLabel ? '-' : null}
      </div>
    );
  }

  // Proceed with valid status
  const colorClass = STATUS_COLORS[status] ?? 'bg-gray-400 dark:bg-gray-500';
  const label = getStatusTranslation(status);

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <div className={cn('size-2.5 rounded-full', colorClass)} />
      {withLabel && label ? label : null}
    </div>
  );
}
