/**
 * Masks an email address for safe server logging.
 * Keeps first and last char of local part, replaces middle with asterisks.
 * Domain is preserved for debugging purposes.
 *
 * Example: john.doe@example.com → j******e@example.com
 *
 * Note: For user-facing display where domain should also be masked,
 * use the maskEmail function in invite/[code]/utils.ts instead.
 */
export function maskEmail(value: string): string {
  const [name = '', domain = ''] = value.toLowerCase().split('@');
  if (!domain) return 'invalid-email';
  const safeName =
    name.length <= 2 ? name[0] ?? '' : `${name[0]}${'*'.repeat(name.length - 2)}${name.at(-1)}`;
  return `${safeName}@${domain}`;
}
