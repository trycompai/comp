import type { AuditLog, Member, Organization, User } from '@db';

// Type-only export — DB queries moved to NestJS API
export type AuditLogWithRelations = AuditLog & {
  user: User | null;
  member: Member | null;
  organization: Organization;
};
