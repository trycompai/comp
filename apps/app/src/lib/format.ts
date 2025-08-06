import { getLocale } from 'gt-next/server';

export async function formatDate(
  date: Date | string | number | undefined,
  opts: Intl.DateTimeFormatOptions = {},
) {
  if (!date) return '';

  try {
    const locale = await getLocale();
    return new Intl.DateTimeFormat(locale, {
      month: opts.month ?? 'long',
      day: opts.day ?? 'numeric',
      year: opts.year ?? 'numeric',
      ...opts,
    }).format(new Date(date));
  } catch (_err) {
    return '';
  }
}
