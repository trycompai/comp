/**
 * Upstash Vector filter DSL does not support bound parameters, so the
 * organizationId must be validated before interpolation. Organization IDs are
 * prefixed CUIDs (`org_` + lowercase alphanumeric), so anything containing
 * quotes, whitespace or filter operators is rejected outright.
 */
const ORGANIZATION_ID_PATTERN = /^org_[a-z0-9]{16,32}$/;

/**
 * Builds an Upstash Vector metadata filter scoping the query to one
 * organization. Throws on any value that is not a well-formed organization ID
 * so an attacker-controlled value can never alter the filter expression.
 */
export function organizationFilter(organizationId: string): string {
  if (!ORGANIZATION_ID_PATTERN.test(organizationId)) {
    throw new Error('Invalid organizationId for vector filter');
  }
  return `organizationId = "${organizationId}"`;
}
