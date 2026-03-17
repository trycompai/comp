import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiSecurity } from '@nestjs/swagger';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';
import { OrganizationId } from '../../auth/auth-context.decorator';
import { db } from '@db';
import { ConnectionRepository } from '../repositories/connection.repository';
import { RampRoleMappingService } from '../services/ramp-role-mapping.service';
import { IntegrationSyncLoggerService } from '../services/integration-sync-logger.service';
import { RampApiService } from '../services/ramp-api.service';
import { type RoleMappingEntry } from '@trycompai/integration-platform';

@Controller({ path: 'integrations/sync/ramp', version: '1' })
@ApiTags('Integrations')
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class RampRoleMappingController {
  constructor(
    private readonly connectionRepository: ConnectionRepository,
    private readonly roleMappingService: RampRoleMappingService,
    private readonly syncLoggerService: IntegrationSyncLoggerService,
    private readonly rampApiService: RampApiService,
  ) {}

  @Post('discover-roles')
  @RequirePermission('integration', 'update')
  async discoverRoles(
    @OrganizationId() organizationId: string,
    @Query('connectionId') connectionId: string,
    @Query('refresh') refresh?: string,
  ) {
    if (!connectionId) {
      throw new HttpException('connectionId is required', HttpStatus.BAD_REQUEST);
    }

    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection || connection.organizationId !== organizationId) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    const shouldRefresh = refresh === 'true';
    let discoveredRoles: Array<{ role: string; userCount: number }>;

    // Use cached roles unless refresh is requested
    const cachedRoles = shouldRefresh
      ? null
      : await this.roleMappingService.getCachedDiscoveredRoles(connectionId);

    if (cachedRoles) {
      discoveredRoles = cachedRoles;
    } else {
      const logId = await this.syncLoggerService.startLog({
        connectionId,
        organizationId,
        provider: 'ramp',
        eventType: 'role_discovery',
        triggeredBy: 'manual',
      });

      try {
        const accessToken = await this.rampApiService.getAccessToken(connectionId, organizationId);
        const users = await this.rampApiService.fetchUsers(accessToken);

        const roleCounts = new Map<string, number>();
        for (const user of users) {
          const role = user.role ?? 'UNKNOWN';
          roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
        }

        discoveredRoles = Array.from(roleCounts.entries())
          .map(([role, userCount]) => ({ role, userCount }))
          .sort((a, b) => b.userCount - a.userCount);

        // Cache the discovered roles (preserve existing mapping if any)
        const existingMapping = await this.roleMappingService.getSavedMapping(connectionId);
        if (existingMapping) {
          await this.roleMappingService.saveMapping(
            connectionId,
            existingMapping,
            discoveredRoles,
          );
        } else {
          await this.roleMappingService.saveDiscoveredRoles(connectionId, discoveredRoles);
        }

        await this.syncLoggerService.completeLog(logId, {
          rolesDiscovered: discoveredRoles.length,
          totalUsers: users.length,
        });
      } catch (error) {
        await this.syncLoggerService.failLog(
          logId,
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }
    }

    const rampRoleNames = discoveredRoles.map((r) => r.role);
    const defaultMapping = this.roleMappingService.getDefaultMapping(rampRoleNames);
    const existingMapping = await this.roleMappingService.getSavedMapping(connectionId);

    // Fetch existing custom roles for this org with their permissions
    const customRoles = await db.organizationRole.findMany({
      where: { organizationId },
      select: { name: true, permissions: true, obligations: true },
      orderBy: { name: 'asc' },
    });

    const existingCustomRoles = customRoles.map((r) => ({
      name: r.name,
      permissions: JSON.parse(r.permissions) as Record<string, string[]>,
      obligations: JSON.parse(r.obligations) as Record<string, boolean>,
    }));

    return { discoveredRoles, defaultMapping, existingMapping, existingCustomRoles };
  }

  @Post('role-mapping')
  @RequirePermission('integration', 'update')
  async saveRoleMapping(
    @OrganizationId() organizationId: string,
    @Body() body: { connectionId: string; mapping: RoleMappingEntry[] },
  ) {
    const { connectionId, mapping } = body;

    if (!connectionId || !Array.isArray(mapping)) {
      throw new HttpException(
        'connectionId and mapping are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection || connection.organizationId !== organizationId) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    const logId = await this.syncLoggerService.startLog({
      connectionId,
      organizationId,
      provider: 'ramp',
      eventType: 'role_mapping_save',
      triggeredBy: 'manual',
    });

    try {
      // Create custom roles in the database
      await this.roleMappingService.ensureCustomRolesExist(organizationId, mapping);

      // Save mapping to connection variables (preserve existing discovered roles)
      await this.roleMappingService.saveMapping(connectionId, mapping);

      await this.syncLoggerService.completeLog(logId, {
        mappingCount: mapping.length,
      });

      return { success: true, mapping };
    } catch (error) {
      await this.syncLoggerService.failLog(
        logId,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  @Get('role-mapping')
  @RequirePermission('integration', 'read')
  async getRoleMapping(
    @OrganizationId() organizationId: string,
    @Query('connectionId') connectionId: string,
  ) {
    if (!connectionId) {
      throw new HttpException('connectionId is required', HttpStatus.BAD_REQUEST);
    }

    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection || connection.organizationId !== organizationId) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    const mapping = await this.roleMappingService.getSavedMapping(connectionId);
    return { mapping };
  }
}
