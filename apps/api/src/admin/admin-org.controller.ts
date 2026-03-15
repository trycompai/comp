import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AdminOrgService } from './admin-org.service';

@Controller({ path: 'admin', version: '1' })
@UseGuards(PlatformAdminGuard)
export class AdminOrgController {
  constructor(private readonly adminOrgService: AdminOrgService) {}

  @Get('orgs/:orgId/health')
  async getOrgHealth(@Param('orgId') orgId: string) {
    return this.adminOrgService.getOrgHealth(orgId);
  }

  @Get('orgs/:orgId/members')
  async getOrgMembers(
    @Param('orgId') orgId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminOrgService.getOrgMembers({
      orgId,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('orgs/:orgId/policies')
  async getOrgPolicies(
    @Param('orgId') orgId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminOrgService.getOrgPolicies({
      orgId,
      status,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('orgs/:orgId/tasks')
  async getOrgTasks(
    @Param('orgId') orgId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminOrgService.getOrgTasks({
      orgId,
      status,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('orgs/:orgId/controls')
  async getOrgControls(
    @Param('orgId') orgId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminOrgService.getOrgControls({
      orgId,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('orgs/:orgId/risks')
  async getOrgRisks(
    @Param('orgId') orgId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminOrgService.getOrgRisks({
      orgId,
      status,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('orgs/:orgId/vendors')
  async getOrgVendors(
    @Param('orgId') orgId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminOrgService.getOrgVendors({
      orgId,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('orgs/:orgId/frameworks')
  async getOrgFrameworks(
    @Param('orgId') orgId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminOrgService.getOrgFrameworks({
      orgId,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('orgs/:orgId/findings')
  async getOrgFindings(
    @Param('orgId') orgId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminOrgService.getOrgFindings({
      orgId,
      status,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('orgs/:orgId/integrations')
  async getOrgIntegrations(
    @Param('orgId') orgId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminOrgService.getOrgIntegrations({
      orgId,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('orgs/:orgId/comments')
  async getOrgComments(
    @Param('orgId') orgId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminOrgService.getOrgComments({
      orgId,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('orgs/:orgId/audit-logs')
  async getOrgAuditLogs(
    @Param('orgId') orgId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminOrgService.getOrgAuditLogs({
      orgId,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }
}
