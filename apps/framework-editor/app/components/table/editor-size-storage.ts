/**
 * Persisted size for the large multi-line cell editor (FRAME-3). The user can
 * resize the editor in both directions; we remember the last size so the next
 * open reuses it. Stored in a cookie (per the ticket), survives reloads.
 */
export interface EditorSize {
  width: number;
  height: number;
}

const COOKIE_NAME = 'fwk-editor-expand-editor-size';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function isValidSize(value: unknown): value is EditorSize {
  if (typeof value !== 'object' || value === null) return false;
  const { width, height } = value as Record<string, unknown>;
  return (
    typeof width === 'number' &&
    typeof height === 'number' &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  );
}

function readCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

export function loadEditorSize(): EditorSize | null {
  if (typeof document === 'undefined') return null;
  try {
    const raw = readCookie(COOKIE_NAME);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    return isValidSize(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveEditorSize(size: EditorSize): void {
  if (typeof document === 'undefined') return;
  if (!isValidSize(size)) return;
  try {
    const value = encodeURIComponent(JSON.stringify(size));
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
  } catch {
    // Ignore — resizing still works in-session even if the cookie can't be set.
  }
}

export function clearEditorSize(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}
