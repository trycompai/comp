import { cn } from '@comp/ui/cn';

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
  'done',
  'not_relevant',
  'failed',
] as const;

export type StatusType = (typeof STATUS_TYPES)[number];

// Updated STATUS_COLORS mapping using Tailwind classes
export const STATUS_COLORS: Record<StatusType, string> = {
  // General / Positive - Green
  published: 'bg-primary',
  open: 'bg-blue-500',
  completed: 'bg-primary',
  done: 'bg-primary',

  // Completed/Done - Blue
  closed: 'bg-primary',

  // Neutral - Gray
  archived: 'bg-gray-500 dark:bg-gray-400',
  todo: 'bg-gray-500 dark:bg-gray-400',

  // In Progress - Yellow
  draft: 'bg-yellow-500 dark:bg-yellow-400',
  pending: 'bg-yellow-500 dark:bg-yellow-400',
  in_progress: 'bg-yellow-500 dark:bg-yellow-400',

  // Warning/Error - Red
  needs_review: 'bg-red-600 dark:bg-red-400',
  not_started: 'bg-red-600 dark:bg-red-400',
  not_relevant: 'bg-red-600 dark:bg-red-400',

  // Failed - Red
  failed: 'bg-red-600 dark:bg-red-400',
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
        <div className="size-2.5 bg-gray-400 dark:bg-gray-500 rounded-none" />
        {withLabel ? '-' : null}
      </div>
    );
  }

  // Proceed with valid status
  const colorClass = STATUS_COLORS[status] ?? 'bg-gray-400 dark:bg-gray-500';
  const label = getStatusTranslation(status);

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <div className={cn('size-2.5 rounded-none', colorClass)} />
      {withLabel && label ? label : null}
    </div>
  );
}
