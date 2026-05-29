import type { IsmsDocumentStatus } from '../../isms/isms-types';

type DisplayStatus = 'Not started' | 'Draft' | 'Pending' | 'Approved' | 'Declined';

const STATUS_CONFIG: Record<DisplayStatus, string> = {
  'Not started': 'bg-slate-100 text-slate-700 dark:bg-slate-950/30 dark:text-slate-300',
  Draft: 'bg-slate-100 text-slate-700 dark:bg-slate-950/30 dark:text-slate-300',
  Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400',
  Approved: 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400',
  Declined: 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400',
};

function toDisplayStatus(status: IsmsDocumentStatus | null): DisplayStatus {
  if (!status) return 'Not started';
  if (status === 'approved') return 'Approved';
  if (status === 'declined') return 'Declined';
  if (status === 'needs_review' || status === 'in_progress') return 'Pending';
  return 'Draft';
}

const PILL_CLASS =
  'inline-flex items-center rounded-sm px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wider leading-none';

export function IsmsStatusBadge({
  status,
  isStale,
}: {
  status: IsmsDocumentStatus | null;
  isStale?: boolean;
}) {
  const display = toDisplayStatus(status);

  return (
    <div className="flex items-center gap-1.5">
      <span className={`${PILL_CLASS} ${STATUS_CONFIG[display]}`}>{display}</span>
      {isStale && (
        <span
          className={`${PILL_CLASS} bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400`}
        >
          Out of date
        </span>
      )}
    </div>
  );
}
