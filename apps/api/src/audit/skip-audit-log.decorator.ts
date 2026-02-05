import { SetMetadata } from '@nestjs/common';

export const SKIP_AUDIT_LOG_KEY = 'skipAuditLog';

/**
 * Decorator to skip automatic audit logging for a specific route.
 * Use this on routes that already have manual audit logging via
 * dedicated audit services (e.g., FindingAuditService).
 */
export const SkipAuditLog = () => SetMetadata(SKIP_AUDIT_LOG_KEY, true);

export const AUDIT_READ_KEY = 'auditRead';

/**
 * Opt a GET endpoint into audit logging.
 * By default, only mutations (POST/PATCH/PUT/DELETE) are logged.
 * Apply this to read endpoints that should be tracked for compliance
 * (e.g., PDF downloads, data exports).
 */
export const AuditRead = () => SetMetadata(AUDIT_READ_KEY, true);
