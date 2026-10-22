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
  xms_edov?: unknown;
  email_verified?: unknown;
  verified_primary_email?: unknown;
  verified_secondary_email?: unknown;
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

function isSameAddress({
  claim,
  email,
}: {
  claim: unknown;
  email: string;
}): boolean {
  return (
    typeof claim === 'string' &&
    claim.trim().toLowerCase() === email.toLowerCase()
  );
}

function listContainsAddress({
  claim,
  email,
}: {
  claim: unknown;
  email: string;
}): boolean {
  const values: unknown[] = Array.isArray(claim) ? claim : [claim];
  return values.some((value) => isSameAddress({ claim: value, email }));
}

export function isMicrosoftEmailVerified({
  profile,
  email,
}: {
  profile: MicrosoftEmailClaims;
  email: string | undefined;
}): boolean {
  if (!email) return false;
  if (
    isSameAddress({ claim: profile.email, email }) &&
    (profile.xms_edov === true || profile.email_verified === true)
  ) {
    return true;
  }
  return (
    listContainsAddress({ claim: profile.verified_primary_email, email }) ||
    listContainsAddress({ claim: profile.verified_secondary_email, email })
  );
}

export function mapMicrosoftProfileToUser(profile: MicrosoftEmailClaims): {
  email: string | undefined;
  emailVerified: boolean;
} {
  const email = resolveMicrosoftEmail(profile);
  return { email, emailVerified: isMicrosoftEmailVerified({ profile, email }) };
}
