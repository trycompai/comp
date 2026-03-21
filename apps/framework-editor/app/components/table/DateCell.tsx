'use client';

interface DateCellProps {
  value: Date | null;
}

export function DateCell({ value }: DateCellProps) {
  if (!value) return <span className="text-muted-foreground px-2 py-1.5 text-sm">—</span>;
  return (
    <span className="text-muted-foreground px-2 py-1.5 text-sm">
      {value.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })}
    </span>
  );
}
