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
]);

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
  app: AuditLogEntityType.organization,
  questionnaire: AuditLogEntityType.organization,
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
};

// Fields that reference the member table and should be resolved to user names.
// Key = request body field name, value = display label in audit log.
export const MEMBER_REF_FIELDS: Record<string, string> = {
  assigneeId: 'assignee',
  approverId: 'approver',
};
