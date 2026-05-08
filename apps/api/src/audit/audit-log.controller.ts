import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { db, Prisma } from '@db';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';

@ApiTags('Audit Logs')
@Controller({ path: 'audit-logs', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class AuditLogController {
  @Get()
  @RequirePermission('app', 'read')
  @ApiOperation({ summary: 'Get audit logs filtered by entity type and ID' })
  @ApiQuery({
    name: 'entityType',
    required: false,
    description: 'Filter by entity type (e.g. policy, task, control)',
  })
  @ApiQuery({
    name: 'entityId',
    required: false,
    description: 'Filter by entity ID',
  })
  @ApiQuery({
    name: 'pathContains',
    required: false,
    description: 'Filter by path substring (e.g. automation ID)',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    description: 'Number of logs to return (max 100, default 50)',
  })
  async getAuditLogs(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('pathContains') pathContains?: string,
    @Query('take') take?: string,
  ) {
    // organizationId comes from auth context (not user input) — ensures tenant isolation
    const where: Record<string, unknown> = { organizationId };
    if (entityType) {
      // Support comma-separated entity types (e.g. "risk,task")
      const types = entityType
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      where.entityType = types.length === 1 ? types[0] : { in: types };
    }
    if (entityId) {
      // Support comma-separated entity IDs
      const ids = entityId
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      where.entityId = ids.length === 1 ? ids[0] : { in: ids };
    }
    if (pathContains) {
      where.data = {
        path: ['path'],
        string_contains: pathContains,
      } satisfies Prisma.JsonFilter;
    }

    const parsedTake = take
      ? Math.min(100, Math.max(1, parseInt(take, 10) || 50))
      : 50;

    const logs = await db.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
        member: true,
        organization: true,
      },
      orderBy: { timestamp: 'desc' },
      take: parsedTake,
    });

    return {
      data: logs,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }
}
