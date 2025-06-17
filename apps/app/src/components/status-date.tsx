'use client';

import { formatDate } from '@/lib/utils/format-date';
import { cn } from '@comp/ui/cn';

interface StatusDateProps {
  date: Date;
  isClosed?: boolean;
}

export function StatusDate({ date, isClosed }: StatusDateProps) {
  const formattedDate = formatDate(date);

  const isOverdue = !isClosed && new Date(date) < new Date();

  return (
    <span
      className={cn(
        'text-sm',
        isOverdue && 'text-destructive',
        isClosed && 'text-muted-foreground line-through',
      )}
    >
      {formattedDate}
    </span>
  );
}
