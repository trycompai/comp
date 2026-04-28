'use client';

export function TaskStatusPill({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ');
  const styles = (() => {
    switch (status) {
      case 'in_progress':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-300';
      case 'in_review':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
      case 'done':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
      case 'failed':
        return 'bg-red-500/15 text-red-700 dark:text-red-300';
      case 'not_relevant':
      case 'todo':
      default:
        return 'bg-muted text-muted-foreground';
    }
  })();
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide whitespace-nowrap ${styles}`}
    >
      {label}
    </span>
  );
}
