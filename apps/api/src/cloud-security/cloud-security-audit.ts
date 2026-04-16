import { db } from '@db';

interface CloudSecurityAuditParams {
  organizationId: string;
  userId: string;
  connectionId: string;
  action:
    | 'scan_started'
    | 'scan_completed'
    | 'remediation_executed'
    | 'remediation_failed'
    | 'rollback_executed'
    | 'rollback_failed'
    | 'service_toggled';
  description: string;
  metadata?: Record<string, unknown>;
}

export async function logCloudSecurityActivity(
  params: CloudSecurityAuditParams,
) {
  try {
    // auditLog.userId is a FK to User — skip if no real user context
    if (!params.userId || params.userId === 'system') {
      return;
    }

    await db.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        entityType: 'integration',
        entityId: params.connectionId,
        description: params.description,
        data: {
          action: params.action,
          resource: 'cloud-security',
          connectionId: params.connectionId,
          ...params.metadata,
        },
      },
    });
  } catch {
    // Don't fail the main operation if audit logging fails
  }
}
