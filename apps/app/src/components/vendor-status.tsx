import { cn } from '@comp/ui/cn';

export const VENDOR_STATUS_TYPES = ['not_assessed', 'in_progress', 'assessed'] as const;

export type VendorStatusType = Exclude<(typeof VENDOR_STATUS_TYPES)[number], 'draft' | 'published'>;

const VENDOR_STATUS_COLORS: Record<VendorStatusType, string> = {
  not_assessed: 'bg-yellow-400 dark:bg-yellow-500',
  in_progress: 'bg-blue-500 dark:bg-blue-400',
  assessed: 'bg-primary',
} as const;

export function VendorStatus({ status }: { status: VendorStatusType }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn('size-2.5', VENDOR_STATUS_COLORS[status])} />
      {status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}
    </div>
  );
}
