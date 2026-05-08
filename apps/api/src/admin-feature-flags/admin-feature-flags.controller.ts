import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { db } from '@db';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AdminAuditLogInterceptor } from '../admin-organizations/admin-audit-log.interceptor';
import { AdminFeatureFlagsService } from './admin-feature-flags.service';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';

@ApiExcludeController()
@ApiTags('Admin - Feature Flags')
@Controller({ path: 'admin/organizations', version: '1' })
@UseGuards(PlatformAdminGuard)
@UseInterceptors(AdminAuditLogInterceptor)
@Throttle({ default: { ttl: 60000, limit: 60 } })
export class AdminFeatureFlagsController {
  constructor(private readonly service: AdminFeatureFlagsService) {}

  @Get(':orgId/feature-flags')
  @ApiOperation({
    summary:
      'List all admin-managed feature flags with their current state for an organization',
  })
  async list(@Param('orgId') orgId: string) {
    const org = await db.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    const flags = await this.service.listForOrganization(orgId);
    return { data: flags };
  }

  @Patch(':orgId/feature-flags')
  @ApiOperation({
    summary: 'Enable or disable a feature flag for an organization',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async update(
    @Param('orgId') orgId: string,
    @Body() dto: UpdateFeatureFlagDto,
  ) {
    const org = await db.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    const result = await this.service.setFlagForOrganization({
      orgId,
      orgName: org.name,
      flagKey: dto.flagKey,
      enabled: dto.enabled,
    });
    return { data: result };
  }
}
