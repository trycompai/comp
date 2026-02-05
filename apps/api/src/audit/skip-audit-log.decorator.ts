import { SetMetadata } from '@nestjs/common';

export const SKIP_AUDIT_LOG_KEY = 'skipAuditLog';

/**
 * Decorator to skip automatic audit logging for a specific route.
 * Use this on routes that already have manual audit logging via
 * dedicated audit services (e.g., FindingAuditService).
 */
export const SkipAuditLog = () => SetMetadata(SKIP_AUDIT_LOG_KEY, true);
