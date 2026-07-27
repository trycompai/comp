import { AuditLogEntityType, CommentEntityType } from '@db';

export const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export const SENSITIVE_KEYS = new Set([
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authorization',
  'credential',
  'credentials',
  'privateKey',
  'private_key',
  // Authenticator (TOTP) material — a reusable MFA secret. Must never land in
  // the audit log in cleartext (browser-connection credential endpoints accept
  // `totpSeed`; the runtime carries `totpCode`).
  'totpSeed',
  'totpCode',
]);

/**
 * Fallback pattern for credential-ish field names the exact-match set misses
 * (e.g. `clientSecret`, `secretAccessKey`, `aws_secret_access_key`). Matched
 * case-insensitively against key names anywhere in the audited body, so new
 * credential fields are redacted without having to enumerate every name.
 */
export const SENSITIVE_KEY_PATTERN =
  /secret|password|passphrase|credential|token|api[_-]?key|private[_-]?key|totp|access[_-]?key/i;

/**
 * Resources whose request body must never be diffed into the audit log at all —
 * the field carrying the secret is generically named (e.g. the secret manager's
 * `value`) so key-based redaction can't catch it, and reading audit logs needs
 * only `app:read`. For these we log the action (Created/Updated/Deleted) with no
 * payload, keeping plaintext out of a store that bypasses `secret:read`.
 */
export const REDACT_BODY_RESOURCES = new Set(['secret']);

export const RESOURCE_TO_ENTITY_TYPE: Record<
  string,
  AuditLogEntityType | null
> = {
  organization: AuditLogEntityType.organization,
  member: AuditLogEntityType.people,
  invitation: AuditLogEntityType.people,
  control: AuditLogEntityType.control,
  evidence: AuditLogEntityType.task,
  policy: AuditLogEntityType.policy,
  risk: AuditLogEntityType.risk,
  vendor: AuditLogEntityType.vendor,
  task: AuditLogEntityType.task,
  framework: AuditLogEntityType.framework,
  finding: AuditLogEntityType.finding,
  integration: AuditLogEntityType.integration,
  portal: AuditLogEntityType.trust,
  trust: AuditLogEntityType.trust,
  app: AuditLogEntityType.organization,
  questionnaire: AuditLogEntityType.organization,
  pentest: AuditLogEntityType.pentest,
  audit: null,
};

export const RESOURCE_TO_PRISMA_MODEL: Record<string, string> = {
  policy: 'policy',
  vendor: 'vendor',
  risk: 'risk',
  control: 'control',
  finding: 'finding',
  organization: 'organization',
  member: 'member',
  framework: 'frameworkInstance',
  task: 'taskItem',
  portal: 'trust',
};

export const COMMENT_ENTITY_TYPE_MAP: Record<string, AuditLogEntityType> = {
  [CommentEntityType.task]: AuditLogEntityType.task,
  [CommentEntityType.vendor]: AuditLogEntityType.vendor,
  [CommentEntityType.risk]: AuditLogEntityType.risk,
  [CommentEntityType.policy]: AuditLogEntityType.policy,
  [CommentEntityType.finding]: AuditLogEntityType.finding,
};

// Fields that reference the member table and should be resolved to user names.
// Key = request body field name, value = display label in audit log.
export const MEMBER_REF_FIELDS: Record<string, string> = {
  assigneeId: 'assignee',
  approverId: 'approver',
};
