import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { Public } from '../auth/public.decorator';
import { RequirePermission } from '../auth/require-permission.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { BackgroundCheckCustomService } from './background-check-custom.service';
import { AttachCustomBackgroundCheckDto } from './dto/attach-custom-background-check.dto';
import { RequestBackgroundCheckDto } from './dto/request-background-check.dto';
import { BackgroundChecksService } from './background-checks.service';

@ApiTags('Background Checks')
@Controller({ path: 'people', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class PeopleBackgroundChecksController {
  constructor(
    private readonly backgroundChecksService: BackgroundChecksService,
    private readonly customService: BackgroundCheckCustomService,
  ) {}

  @Get(':id/background-check')
  @RequirePermission('member', 'read')
  @ApiOperation({ summary: 'Get member background check request' })
  async getForMember(
    @Param('id') memberId: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.backgroundChecksService.getForMember({ organizationId, memberId });
  }

  @Post(':id/background-check')
  @HttpCode(200)
  @RequirePermission('member', 'update')
  @ApiOperation({ summary: 'Request a background check for a member' })
  async requestForMember(
    @Param('id') memberId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Body() body: RequestBackgroundCheckDto,
  ) {
    return this.backgroundChecksService.requestForMember({
      organizationId,
      memberId,
      employeeName: body.employeeName,
      employeeEmail: body.employeeEmail.trim().toLowerCase(),
      requesterNotes: body.requesterNotes?.trim() || undefined,
      requesterEmail: authContext.userEmail ?? 'api-key@trycomp.ai',
    });
  }

  @Get(':id/background-check/custom-attachments')
  @RequirePermission('member', 'read')
  @ApiOperation({ summary: 'Get custom background check attachments for a member' })
  async getCustomAttachmentsForMember(
    @Param('id') memberId: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.customService.getAttachmentsForMember({ organizationId, memberId });
  }

  @Post(':id/background-check/custom')
  @HttpCode(200)
  @RequirePermission('member', 'update')
  @ApiOperation({ summary: 'Attach a custom background check for a member' })
  async attachCustomForMember(
    @Param('id') memberId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Body() body: AttachCustomBackgroundCheckDto,
  ) {
    return this.customService.attachForMember({
      organizationId,
      memberId,
      employeeName: body.employeeName,
      employeeEmail: body.employeeEmail,
      requesterNotes: body.requesterNotes?.trim() || undefined,
      upload: {
        fileName: body.fileName,
        fileType: body.fileType,
        fileData: body.fileData,
      },
      userId: authContext.userId,
    });
  }
}

@ApiTags('Background Checks')
@Controller({ path: 'background-checks', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class BackgroundChecksController {
  constructor(private readonly backgroundChecksService: BackgroundChecksService) {}

  @Get(':id')
  @RequirePermission('member', 'read')
  @ApiOperation({ summary: 'Get a background check by local or Identity ID' })
  async getById(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.backgroundChecksService.getById({ organizationId, id });
  }

  @Post('webhook')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Identity background check webhook events' })
  async handleWebhook(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.backgroundChecksService.handleWebhook({
      rawBody: req.rawBody,
      headers,
    });
  }
}
