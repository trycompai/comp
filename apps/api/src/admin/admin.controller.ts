import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AdminService } from './admin.service';

@Controller({ path: 'admin', version: '1' })
@UseGuards(PlatformAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('orgs')
  async listOrgs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.listOrgs({
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('orgs/:id')
  async getOrg(@Param('id') id: string) {
    return this.adminService.getOrg(id);
  }

  @Get('users/search')
  async searchUsers(@Query('email') email: string) {
    return this.adminService.searchUsers(email);
  }

  @Get('users')
  async listUsers(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.listUsers({
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Post('users/:id/platform-admin')
  async togglePlatformAdmin(@Param('id') id: string) {
    return this.adminService.togglePlatformAdmin(id);
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Query('orgId') orgId?: string,
    @Query('entityType') entityType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.getAuditLogs({
      orgId,
      entityType,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }
}
