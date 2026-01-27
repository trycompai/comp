/**
 * Masks an email address for safe logging.
 * Keeps first and last char of local part, replaces middle with asterisks.
 * Domain is preserved for debugging purposes.
 *
 * Example: john.doe@example.com → j******e@example.com
 */
export function maskEmail(value: string): string {
  const [name = '', domain = ''] = value.toLowerCase().split('@');
  if (!domain) return 'invalid-email';
  const safeName =
    name.length <= 2 ? name[0] ?? '' : `${name[0]}${'*'.repeat(name.length - 2)}${name.at(-1)}`;
  return `${safeName}@${domain}`;
}

/**
 * Masks a comma-separated list of email addresses.
 */
export function maskEmailList(value: string): string {
  return value
    .split(',')
    .map((email) => maskEmail(email.trim()))
    .join(', ');
}
