import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { db } from '@trycompai/db';
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
  @ApiQuery({ name: 'entityType', required: false, description: 'Filter by entity type (e.g. policy, task, control)' })
  @ApiQuery({ name: 'entityId', required: false, description: 'Filter by entity ID' })
  @ApiQuery({ name: 'take', required: false, description: 'Number of logs to return (max 100, default 50)' })
  async getAuditLogs(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('take') take?: string,
  ) {
    // organizationId comes from auth context (not user input) — ensures tenant isolation
    const where: Record<string, unknown> = { organizationId };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const parsedTake = take
      ? Math.min(100, Math.max(1, parseInt(take, 10) || 50))
      : 50;

    const logs = await db.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
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
