export function columnIndexToName(index: number): string {
  if (!Number.isInteger(index) || index < 0) return '';

  let value = index + 1;
  let name = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

export function columnNameToIndex(value: string): number | null {
  const normalized = normalizeColumnName(value);
  if (!normalized) return null;

  let index = 0;
  for (const character of normalized) {
    index = index * 26 + character.charCodeAt(0) - 64;
  }
  return index - 1;
}

export function normalizeColumnName(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{1,3}$/.test(normalized) ? normalized : null;
}
