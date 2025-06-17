import { format, isValid } from 'date-fns';

export function formatDate(date: Date | string | null) {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (!isValid(dateObj)) return '';

  return format(dateObj, 'MM/dd/yyyy');
}
