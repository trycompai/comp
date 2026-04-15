import { Injectable } from '@nestjs/common';
import { db, Prisma } from '@db';

export interface ActivityEntry {
  id: string;
  type: 'scan' | 'remediation' | 'rollback' | 'service_change';
  description: string;
  userId: string | null;
  userName: string | null;
  status: 'success' | 'failed' | 'info';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const ACTION_TYPE_MAP: Record<string, ActivityEntry['type']> = {
  scan_started: 'scan',
  scan_completed: 'scan',
  remediation_executed: 'remediation',
  remediation_failed: 'remediation',
  rollback_executed: 'rollback',
  rollback_failed: 'rollback',
  service_toggled: 'service_change',
};

const REMEDIATION_STATUS_MAP: Record<string, ActivityEntry['status']> = {
  success: 'success',
  executing: 'info',
  failed: 'failed',
  rolled_back: 'info',
  rollback_failed: 'failed',
  pending: 'info',
};

@Injectable()
export class CloudSecurityActivityService {
  async getActivity(params: {
    connectionId: string;
    organizationId: string;
    take: number;
  }): Promise<ActivityEntry[]> {
    // Fetch both sources in parallel
    const [auditLogs, remediationActions] = await Promise.all([
      this.getAuditLogEntries(params),
      this.getRemediationEntries(params),
    ]);

    // Merge and sort by timestamp descending
    const merged = [...auditLogs, ...remediationActions].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return merged.slice(0, params.take);
  }

  private async getAuditLogEntries(params: {
    connectionId: string;
    organizationId: string;
  }): Promise<ActivityEntry[]> {
    const logs = await db.auditLog.findMany({
      where: {
        organizationId: params.organizationId,
        entityType: 'integration',
        AND: [
          {
            data: {
              path: ['resource'],
              equals: 'cloud-security',
            } satisfies Prisma.JsonFilter,
          },
          {
            data: {
              path: ['connectionId'],
              equals: params.connectionId,
            } satisfies Prisma.JsonFilter,
          },
        ],
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return logs.map((log) => {
      const data = log.data as Record<string, unknown>;
      const action = data.action as string;

      let status: ActivityEntry['status'] = 'info';
      if (action === 'scan_completed') status = 'success';
      if (action === 'remediation_executed') status = 'success';
      if (action === 'rollback_executed') status = 'success';
      if (action === 'remediation_failed') status = 'failed';
      if (action === 'rollback_failed') status = 'failed';

      return {
        id: log.id,
        type: ACTION_TYPE_MAP[action] ?? 'scan',
        description: log.description ?? '',
        userId: log.user?.id ?? null,
        userName: log.user?.name ?? null,
        status,
        timestamp: log.timestamp.toISOString(),
        metadata: data,
      };
    });
  }

  private async getRemediationEntries(params: {
    connectionId: string;
    organizationId: string;
  }): Promise<ActivityEntry[]> {
    const actions = await db.remediationAction.findMany({
      where: {
        connectionId: params.connectionId,
        organizationId: params.organizationId,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Collect unique user IDs to fetch names
    const userIds = [...new Set(actions.map((a) => a.initiatedById))];
    const filteredUserIds = userIds.filter((id) => id !== 'system');
    const users =
      filteredUserIds.length > 0
        ? await db.user.findMany({
            where: { id: { in: filteredUserIds } },
            select: { id: true, name: true },
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u.name]));
    userMap.set('system', 'System');

    return actions.map((action) => {
      const isRollback =
        action.status === 'rolled_back' || action.status === 'rollback_failed';
      const type: ActivityEntry['type'] = isRollback
        ? 'rollback'
        : 'remediation';

      let description: string;
      switch (action.status) {
        case 'success':
          description = `Applied auto-fix: ${action.remediationKey} on ${action.resourceId}`;
          break;
        case 'failed':
          description = `Auto-fix failed: ${action.remediationKey} on ${action.resourceId}`;
          break;
        case 'rolled_back':
          description = `Rolled back: ${action.remediationKey} on ${action.resourceId}`;
          break;
        case 'rollback_failed':
          description = `Rollback failed: ${action.remediationKey} on ${action.resourceId}`;
          break;
        case 'executing':
          description = `Executing: ${action.remediationKey} on ${action.resourceId}`;
          break;
        default:
          description = `${action.remediationKey} on ${action.resourceId} (${action.status})`;
      }

      return {
        id: action.id,
        type,
        description,
        userId: action.initiatedById,
        userName: userMap.get(action.initiatedById) ?? null,
        status: REMEDIATION_STATUS_MAP[action.status] ?? 'info',
        timestamp: (action.executedAt ?? action.createdAt).toISOString(),
        metadata: {
          remediationKey: action.remediationKey,
          resourceId: action.resourceId,
          resourceType: action.resourceType,
          riskLevel: action.riskLevel,
          errorMessage: action.errorMessage,
        },
      };
    });
  }
}
