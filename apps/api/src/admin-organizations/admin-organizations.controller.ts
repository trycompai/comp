import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AdminOrganizationsService } from './admin-organizations.service';
import { AdminAuditLogInterceptor } from './admin-audit-log.interceptor';
import { InviteMemberDto } from './dto/invite-member.dto';

@ApiTags('Admin - Organizations')
@Controller({ path: 'admin/organizations', version: '1' })
@UseGuards(PlatformAdminGuard)
@UseInterceptors(AdminAuditLogInterceptor)
@Throttle({ default: { ttl: 60000, limit: 30 } })
export class AdminOrganizationsController {
  constructor(private readonly service: AdminOrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all organizations (platform admin)' })
  async list(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listOrganizations({
      search,
      page: Math.max(1, parseInt(page || '1', 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit || '50', 10) || 50)),
    });
  }

  @Get('activity')
  @ApiOperation({ summary: 'Organization activity report - shows last session per org (platform admin)' })
  @ApiQuery({ name: 'inactiveDays', required: false, description: 'Filter orgs with no session in N days (default: 90)' })
  @ApiQuery({ name: 'hasAccess', required: false, description: 'Filter by hasAccess (true/false)' })
  @ApiQuery({ name: 'onboarded', required: false, description: 'Filter by onboardingCompleted (true/false)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async activity(
    @Query('inactiveDays') inactiveDays?: string,
    @Query('hasAccess') hasAccess?: string,
    @Query('onboarded') onboarded?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getOrgActivity({
      inactiveDays: Math.max(0, Number.isFinite(parseInt(inactiveDays ?? '90', 10)) ? parseInt(inactiveDays ?? '90', 10) : 90),
      hasAccess: hasAccess === 'true' ? true : hasAccess === 'false' ? false : undefined,
      onboarded: onboarded === 'true' ? true : onboarded === 'false' ? false : undefined,
      page: Math.max(1, parseInt(page || '1', 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit || '50', 10) || 50)),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization details (platform admin)' })
  async get(@Param('id') id: string) {
    return this.service.getOrganization(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate organization access (platform admin)' })
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async activate(@Param('id') id: string) {
    return this.service.setAccess(id, true);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate organization access (platform admin)' })
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async deactivate(@Param('id') id: string) {
    return this.service.setAccess(id, false);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite member to organization (platform admin)' })
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async inviteMember(
    @Param('id') id: string,
    @Req() req: { userId: string },
    @Body() body: InviteMemberDto,
  ) {
    return this.service.inviteMember({
      orgId: id,
      email: body.email,
      role: body.role,
      adminUserId: req.userId,
    });
  }

  @Get(':id/audit-logs')
  @ApiOperation({ summary: 'Get audit logs for an organization (platform admin)' })
  @ApiQuery({ name: 'entityType', required: false, description: 'Filter by entity type (e.g. policy, task)' })
  @ApiQuery({ name: 'take', required: false, description: 'Number of logs to return (max 100, default 100)' })
  async getAuditLogs(
    @Param('id') id: string,
    @Query('entityType') entityType?: string,
    @Query('take') take?: string,
  ) {
    return this.service.getAuditLogs({ orgId: id, entityType, take });
  }

  @Get(':id/invitations')
  @ApiOperation({ summary: 'List pending invitations (platform admin)' })
  async listInvitations(@Param('id') id: string) {
    return this.service.listInvitations(id);
  }

  @Delete(':id/invitations/:invId')
  @ApiOperation({ summary: 'Revoke invitation (platform admin)' })
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async revokeInvitation(
    @Param('id') id: string,
    @Param('invId') invId: string,
  ) {
    return this.service.revokeInvitation(id, invId);
  }
}
