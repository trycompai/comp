// Shared contract between the write path (storing a login into 1Password) and the
// read path (resolving it at run time). Both sides MUST use the same field titles
// and reference format, so they live here as the single source of truth.

export const ONEPASSWORD_PROVIDER = '1password';

// Field titles match 1Password's built-in Login item fields so secret references
// (`op://<vault>/<item>/<field>`) resolve them by label.
export const USERNAME_FIELD_TITLE = 'username';
export const PASSWORD_FIELD_TITLE = 'password';
export const TOTP_FIELD_TITLE = 'one-time password';

export function buildOrgVaultTitle(organizationId: string): string {
  return `Comp AI Browser Automations — ${organizationId}`;
}

export function buildItemReference(vaultId: string, itemId: string): string {
  return `op://${vaultId}/${itemId}`;
}

export function buildFieldReference(
  itemRef: string,
  fieldTitle: string,
): string {
  return `${itemRef}/${fieldTitle}`;
}

// The `?attribute=otp` modifier makes 1Password return the *computed* 6-digit
// code for a Totp field rather than the stored seed.
export function buildTotpReference(itemRef: string): string {
  return `${itemRef}/${TOTP_FIELD_TITLE}?attribute=otp`;
}
