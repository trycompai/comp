/**
 * Persisted column widths for resizable tables (FRAME-17). Stored in a cookie
 * (per the ticket) keyed by column id, so resizing persists across sessions.
 */

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const MIN_WIDTH = 1;

/** Keep only finite, positive numeric widths — drops anything malformed. */
export function sanitizeWidths(value: unknown): Record<string, number> {
  if (typeof value !== 'object' || value === null) return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'number' && Number.isFinite(raw) && raw >= MIN_WIDTH) {
      out[key] = Math.round(raw);
    }
  }
  return out;
}

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

export function loadColumnWidths(cookieName: string): Record<string, number> {
  if (typeof document === 'undefined') return {};
  try {
    const raw = readCookie(cookieName);
    if (!raw) return {};
    return sanitizeWidths(JSON.parse(decodeURIComponent(raw)));
  } catch {
    return {};
  }
}

export function saveColumnWidths(cookieName: string, widths: Record<string, number>): void {
  if (typeof document === 'undefined') return;
  try {
    const value = encodeURIComponent(JSON.stringify(sanitizeWidths(widths)));
    document.cookie = `${cookieName}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
  } catch {
    // Ignore — resizing still works in-session even if the cookie can't be set.
  }
}
