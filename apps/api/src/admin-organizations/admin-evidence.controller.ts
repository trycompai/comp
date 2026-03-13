import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { EvidenceFormsService } from '../evidence-forms/evidence-forms.service';
import { AdminAuditLogInterceptor } from './admin-audit-log.interceptor';
import {
  type AdminRequest,
  buildPlatformAdminAuthContext,
} from './platform-admin-auth-context';

@ApiTags('Admin - Evidence')
@Controller({ path: 'admin/organizations', version: '1' })
@UseGuards(PlatformAdminGuard)
@UseInterceptors(AdminAuditLogInterceptor)
@Throttle({ default: { ttl: 60000, limit: 30 } })
export class AdminEvidenceController {
  constructor(
    private readonly evidenceFormsService: EvidenceFormsService,
  ) {}

  @Get(':orgId/evidence-forms')
  @ApiOperation({ summary: 'List evidence form statuses for an organization (admin)' })
  async listFormStatuses(@Param('orgId') orgId: string) {
    return this.evidenceFormsService.getFormStatuses(orgId);
  }

  @Get(':orgId/evidence-forms/:formType')
  @ApiOperation({ summary: 'Get evidence form with submissions (admin)' })
  async getFormWithSubmissions(
    @Param('orgId') orgId: string,
    @Param('formType') formType: string,
    @Req() req: AdminRequest,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (!formType) {
      throw new BadRequestException('formType is required');
    }

    return this.evidenceFormsService.getFormWithSubmissions({
      organizationId: orgId,
      authContext: buildPlatformAdminAuthContext(req.userId, orgId),
      formType,
      search,
      limit: limit ? String(Math.min(200, Math.max(1, parseInt(limit, 10) || 1))) : undefined,
      offset: offset ? String(Math.max(0, parseInt(offset, 10) || 0)) : undefined,
    });
  }
}
