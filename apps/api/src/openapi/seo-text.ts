const TRAILING_FRAGMENT_WORDS = [
  'and',
  'bearer',
  'by',
  'for',
  'from',
  'or',
  'session',
  'to',
  'via',
  'with',
];

function removeAuthBoilerplate(value: string): string {
  return value
    .replace(/Supports both API key authentication[^.]*\./gi, '')
    .replace(/Supports API key authentication[^.]*\./gi, '')
    .replace(/Supports session authentication[^.]*\./gi, '');
}

function toSentence(value: string): string {
  const normalized = removeAuthBoilerplate(value).replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return normalized;
  }

  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function trimToWordBoundary(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const truncated = value.slice(0, maxLength - 1);
  const boundary = truncated.lastIndexOf(' ');
  let safe = boundary > 80 ? truncated.slice(0, boundary) : truncated;
  while (
    TRAILING_FRAGMENT_WORDS.some((word) =>
      new RegExp(`\\b${word}$`, 'i').test(safe),
    )
  ) {
    safe = safe.slice(0, safe.lastIndexOf(' ')).trim();
  }
  return `${safe.replace(/[.,;:!?]+$/, '')}.`;
}

function trimTitle(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const truncated = normalized.slice(0, maxLength);
  const boundary = truncated.lastIndexOf(' ');
  return (boundary > 32 ? truncated.slice(0, boundary) : truncated).replace(
    /[.,;:!?]+$/,
    '',
  );
}

export function toSeoTitle(summary: string): string {
  const suffix = ' | Comp AI API';
  return `${trimTitle(summary, 60 - suffix.length)}${suffix}`;
}

export function toSeoDescription(value: string): string {
  return trimToWordBoundary(toSentence(value), 158);
}

export function toOperationDescription(value: string): string {
  return trimToWordBoundary(toSentence(value), 240);
}

export function toActionFragment(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?]+$/, '');
}
