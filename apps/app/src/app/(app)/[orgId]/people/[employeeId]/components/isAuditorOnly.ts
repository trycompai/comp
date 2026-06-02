/**
 * A member is "auditor-only" when every one of their (comma-separated) roles is
 * `auditor`. Auditor-only members are external reviewers and are not subject to
 * people-security requirements such as background checks (CS-416). A member with
 * `auditor` plus another role still carries that other role's obligations.
 */
export function isAuditorOnly(role: string | null | undefined): boolean {
  const roles = (role ?? '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
  return roles.length > 0 && roles.every((r) => r === 'auditor');
}
