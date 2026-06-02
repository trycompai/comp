import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationId } from '@/auth/auth-context.decorator';
import { HybridAuthGuard } from '@/auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { UserId } from '@/auth/auth-context.decorator';
import { IsmsService } from './isms.service';
import { IsmsContextService } from './isms-context.service';
import { IsmsDocumentControlService } from './isms-document-control.service';
import { EnsureIsmsSetupDto } from './dto/ensure-isms-setup.dto';
import { SubmitIsmsForApprovalDto } from './dto/submit-isms-for-approval.dto';
import { ExportIsmsDocumentDto } from './dto/export-isms-document.dto';
import { LinkIsmsControlsDto } from './dto/link-isms-controls.dto';

@ApiTags('ISMS')
@Controller({ path: 'isms', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class IsmsController {
  constructor(
    private readonly ismsService: IsmsService,
    private readonly contextService: IsmsContextService,
    private readonly documentControlService: IsmsDocumentControlService,
  ) {}

  @Post('ensure-setup')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('evidence', 'read')
  @ApiOperation({ summary: 'Ensure ISMS foundational documents exist' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Setup ensured' })
  async ensureSetup(@Body() dto: EnsureIsmsSetupDto) {
    return this.ismsService.ensureSetup(dto);
  }

  @Get('documents/:id')
  @RequirePermission('evidence', 'read')
  @ApiOperation({ summary: 'Get an ISMS document with its latest version' })
  @ApiOkResponse({ description: 'ISMS document' })
  async getDocument(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.ismsService.getDocument({ documentId: id, organizationId });
  }

  @Post('documents/:id/controls')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Map organization controls to an ISMS document' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Controls linked' })
  async addControls(
    @Param('id') id: string,
    @Body() dto: LinkIsmsControlsDto,
    @OrganizationId() organizationId: string,
  ) {
    return this.documentControlService.addControls({
      documentId: id,
      organizationId,
      controlIds: dto.controlIds,
    });
  }

  @Delete('documents/:id/controls/:controlId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Remove a control mapping from an ISMS document' })
  @ApiOkResponse({ description: 'Control unlinked' })
  async removeControl(
    @Param('id') id: string,
    @Param('controlId') controlId: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.documentControlService.removeControl({
      documentId: id,
      organizationId,
      controlId,
    });
  }

  @Post('documents/:id/generate')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Derive Context-of-the-Organization issues' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Document with derived issues' })
  async generate(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.contextService.generate({ documentId: id, organizationId });
  }

  @Post('documents/:id/submit-for-approval')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Submit an ISMS document for approval' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Document submitted for approval' })
  async submitForApproval(
    @Param('id') id: string,
    @Body() dto: SubmitIsmsForApprovalDto,
    @OrganizationId() organizationId: string,
  ) {
    return this.ismsService.submitForApproval({
      documentId: id,
      organizationId,
      dto,
    });
  }

  @Post('documents/:id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Approve an ISMS document' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Document approved' })
  async approve(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    return this.ismsService.approve({
      documentId: id,
      organizationId,
      userId,
    });
  }

  @Post('documents/:id/decline')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Decline an ISMS document' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Document declined' })
  async decline(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.ismsService.decline({ documentId: id, organizationId });
  }

  @Get('documents/:id/drift')
  @RequirePermission('evidence', 'read')
  @ApiOperation({ summary: 'Detect drift against the approved snapshot' })
  @ApiOkResponse({ description: 'Drift status' })
  async drift(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.contextService.drift({ documentId: id, organizationId });
  }

  @Post('documents/:id/export')
  @RequirePermission('evidence', 'read')
  @ApiOperation({ summary: 'Export an ISMS document as PDF or DOCX' })
  @ApiConsumes('application/json')
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'Rendered document' })
  async exportDocument(
    @Param('id') id: string,
    @Body() dto: ExportIsmsDocumentDto,
    @OrganizationId() organizationId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const result = await this.contextService.exportDocument({
      documentId: id,
      organizationId,
      dto,
    });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.fileBuffer);
  }
}
