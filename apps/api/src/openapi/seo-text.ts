function toSentence(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
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
  const safe = boundary > 80 ? truncated.slice(0, boundary) : truncated;
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
