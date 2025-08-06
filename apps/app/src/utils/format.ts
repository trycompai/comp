import type { TZDate } from '@date-fns/tz';
import { differenceInDays, differenceInMonths, format, isSameYear, startOfDay } from 'date-fns';

export function formatSize(bytes: number): string {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'];

  const unitIndex = Math.max(
    0,
    Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1),
  );

  return Intl.NumberFormat('en-US', {
    style: 'unit',
    unit: units[unitIndex],
  }).format(+Math.round(bytes / 1024 ** unitIndex));
}

type FormatAmountParams = {
  currency: string;
  amount: number;
  locale?: string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
};

export function formatAmount({
  currency,
  amount,
  locale = 'en-US',
  minimumFractionDigits,
  maximumFractionDigits,
}: FormatAmountParams) {
  if (!currency) {
    return;
  }

  return Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

export function secondsToHoursAndMinutes(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours && minutes) {
    return `${hours}:${minutes.toString().padStart(2, '0')}h`;
  }

  if (hours) {
    return `${hours}h`;
  }

  if (minutes) {
    return `${minutes}m`;
  }

  return '0h';
}

type BurnRateData = {
  value: number;
  date: string;
};

export function calculateAvgBurnRate(data: BurnRateData[] | null) {
  if (!data) {
    return 0;
  }

  return data?.reduce((acc, curr) => acc + curr.value, 0) / data?.length;
}

export function formatDate(date: string, dateFormat?: string) {
  if (isSameYear(new Date(), new Date(date))) {
    return format(new Date(date), 'MMM dd, yyyy');
  }

  return format(new Date(date), dateFormat ?? 'P');
}

export function getInitials(value: string) {
  const formatted = value.toUpperCase().replace(/[\s.-]/g, '');

  if (formatted.split(' ').length > 1) {
    return `${formatted.charAt(0)}${formatted.charAt(1)}`;
  }

  if (value.length > 1) {
    return formatted.charAt(0) + formatted.charAt(1);
  }

  return formatted.charAt(0);
}

export function formatAccountName({ name, currency }: { name?: string; currency?: string }) {
  if (currency) {
    return `${name} (${currency})`;
  }

  return name;
}

export function formatDateRange(dates: TZDate[]): string {
  if (!dates.length) return '';

  const formatFullDate = (date: TZDate) => format(date, 'MMM d');
  const formatDay = (date: TZDate) => format(date, 'd');

  if (dates.length === 1 || dates[0]?.getTime() === dates[1]?.getTime()) {
    return formatFullDate(dates[0]!);
  }

  const startDate = dates[0];
  const endDate = dates[1];

  if (!startDate || !endDate) return '';

  if (startDate.getMonth() === endDate.getMonth()) {
    // Same month
    return `${format(startDate, 'MMM')} ${formatDay(startDate)} - ${formatDay(endDate)}`;
  }
  // Different months
  return `${formatFullDate(startDate)} - ${formatFullDate(endDate)}`;
}

export function getDueDateStatus(dueDate: string, t: (content: string, options?: any) => string): string {
  const now = new Date();
  const due = new Date(dueDate);

  // Set both dates to the start of their respective days
  const nowDay = startOfDay(now);
  const dueDay = startOfDay(due);

  const diffDays = differenceInDays(dueDay, nowDay);
  const diffMonths = differenceInMonths(dueDay, nowDay);

  if (diffDays === 0) return t('Today');
  if (diffDays === 1) return t('Tomorrow');
  if (diffDays === -1) return t('Yesterday');

  if (diffDays > 0) {
    if (diffMonths < 1) return t('in {diffDays} days', { diffDays });
    return t('in {diffMonths} month{monthSuffix}', { diffMonths, monthSuffix: diffMonths === 1 ? '' : 's' });
  }

  const absDiffDays = Math.abs(diffDays);
  if (diffMonths < 1) return t('{absDiffDays} day{daySuffix} ago', { absDiffDays, daySuffix: absDiffDays === 1 ? '' : 's' });
  return t('{diffMonths} month{monthSuffix} ago', { diffMonths: Math.abs(diffMonths), monthSuffix: Math.abs(diffMonths) === 1 ? '' : 's' });
}

export const getFormatRelativeTime = (date: Date | string, t: (content: string, options?: any) => string) => {
  const now = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return t('just now');
  }

  const intervals = [
    { label: 'y', seconds: 31536000 },
    { label: 'mo', seconds: 2592000 },
    { label: 'd', seconds: 86400 },
    { label: 'h', seconds: 3600 },
    { label: 'm', seconds: 60 },
  ] as const;

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count > 0) {
      return t('{count}{label} ago', { count, label: interval.label });
    }
  }

  return t('just now');
};
