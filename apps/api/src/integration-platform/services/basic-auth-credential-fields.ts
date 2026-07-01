import type {
  BasicAuthConfig,
  CredentialField,
} from '@trycompai/integration-platform';

/**
 * Turn a credential field name into a human-readable label.
 * e.g. "api_key" → "API Key", "api_secret" → "API Secret", "username" → "Username".
 */
function humanizeFieldName(fieldName: string): string {
  return fieldName
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) =>
      word.toLowerCase() === 'api'
        ? 'API'
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ');
}

/**
 * Build the credential form fields for a Basic-auth integration from its auth
 * config.
 *
 * The field ids MUST equal the config's `usernameField`/`passwordField` so the
 * values the customer enters are stored under the same keys the runtime reads
 * when it builds the `Authorization: Basic` header (see runtime/check-context.ts).
 * Fivetran, for example, maps Basic auth to `api_key`/`api_secret` — without
 * these synthesized fields the connect form falls back to generic
 * `username`/`password` ids, the runtime looks up the never-set real field names
 * and sends `Basic base64(":")`, and every check fails with a 401.
 */
export function buildBasicAuthCredentialFields(
  config: BasicAuthConfig,
): CredentialField[] {
  const usernameField = config.usernameField || 'username';
  const passwordField = config.passwordField || 'password';
  const usernameLabel = humanizeFieldName(usernameField);
  const passwordLabel = humanizeFieldName(passwordField);

  return [
    {
      id: usernameField,
      label: usernameLabel,
      type: 'text',
      required: true,
      placeholder: `Enter ${usernameLabel}`,
    },
    {
      id: passwordField,
      label: passwordLabel,
      type: 'password',
      required: true,
      placeholder: `Enter ${passwordLabel}`,
    },
  ];
}
