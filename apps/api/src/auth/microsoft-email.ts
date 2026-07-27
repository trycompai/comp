/**
 * Resolve a usable email address for a Microsoft (Entra ID) sign-in.
 *
 * better-auth's built-in `microsoft` provider derives the user's email solely
 * from the ID token's `email` claim (see `@better-auth/core`
 * `social-providers/microsoft-entra-id`: `email: user.email`). Microsoft Entra
 * only emits that claim when the account has a `mail` attribute set, or when
 * `email` is configured as an optional claim in the app registration. Many
 * work/school accounts therefore arrive with NO `email` claim — and better-auth
 * then aborts the sign-in with `error=email_not_found`, bouncing the user to the
 * API root (Swagger) instead of the app.
 *
 * We fall back to the username claims (`preferred_username`, then `upn`), which
 * are the email-form login for Entra accounts. This mirrors better-auth's own
 * `microsoftEntraId` generic-oauth helper (`profile.email ?? profile.preferred_username`).
 *
 * Safety:
 * - When Microsoft DOES return an `email` claim, this returns it unchanged —
 *   accounts that already work are unaffected.
 * - The input is a decoded, attacker-influenced JWT, so each claim is validated
 *   to actually be a non-empty string at runtime (a malformed token with a
 *   non-string claim must not crash sign-in).
 * - Returns `undefined` only when no usable identifier is present, so a
 *   genuinely identifier-less account still fails loudly rather than signing in
 *   with an empty email.
 */
export interface MicrosoftEmailClaims {
  email?: string | null;
  preferred_username?: string | null;
  upn?: string | null;
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return undefined;
}

export function resolveMicrosoftEmail(
  profile: MicrosoftEmailClaims,
): string | undefined {
  return firstNonEmptyString(
    profile.email,
    profile.preferred_username,
    profile.upn,
  );
}
