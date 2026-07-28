/**
 * Normalizes and validates an authenticator "setup key" before it is stored, so
 * a direct API caller can't silently replace a working TOTP seed with a rotating
 * one-time code (which can't generate future codes) or other junk — which would
 * quietly break unattended sign-in. Returns the value to store, or `null` when it
 * isn't a usable secret.
 *
 * Accepts either:
 * - a Base32 secret (RFC 4648) — formatting spaces/hyphens are cosmetic and are
 *   stripped; or
 * - a full `otpauth://` URI — kept verbatim (the vault extracts the secret and
 *   its parameters from it).
 */
export function normalizeTotpSecret(
  raw: string | undefined | null,
): string | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;

  // An otpauth:// URI carries the secret and its parameters — keep it as-is.
  if (/^otpauth:\/\//i.test(trimmed)) return trimmed;

  // Otherwise expect a Base32 secret; spaces/hyphens are display grouping only.
  const compact = trimmed.replace(/[\s-]/g, '').toUpperCase();

  // A short all-digits value is a rotating one-time code pasted by mistake.
  if (/^\d{4,10}$/.test(compact)) return null;

  const unpadded = compact.replace(/=+$/, '');
  // RFC 4648 Base32 alphabet (A–Z, 2–7); real TOTP seeds are >= 16 chars.
  if (!/^[A-Z2-7]+$/.test(unpadded) || unpadded.length < 16) return null;

  return compact;
}
