import { SetMetadata } from '@nestjs/common';

export const SKIP_ADMIN_AUDIT_LOG_KEY = 'skipAdminAuditLog';

export const SkipAdminAuditLog = () =>
  SetMetadata(SKIP_ADMIN_AUDIT_LOG_KEY, true);
