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
import {
  AuthContext,
  OrganizationId,
  UserId,
} from '@/auth/auth-context.decorator';
import type { AuthContext as AuthContextType } from '@/auth/types';
import { HybridAuthGuard } from '@/auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { resolveRolePermissions, permissionsGrant } from '../auth/app-access';
import { resolveServiceByName } from '../auth/service-token.config';
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

  // Gated at evidence:read so read-only auditors can LIST existing ISMS
  // documents, but provisioning only happens when the caller can actually write
  // (evidence:update) — resolved below and threaded as `canWrite`. This keeps
  // read-only callers from creating rows just by viewing the page.
  @Post('ensure-setup')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('evidence', 'read')
  @ApiOperation({ summary: 'Ensure ISMS foundational documents exist' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Setup ensured' })
  async ensureSetup(
    @Body() dto: EnsureIsmsSetupDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    return this.ismsService.ensureSetup({
      organizationId,
      frameworkId: dto.frameworkId,
      canWrite: await this.resolveCanWrite(authContext),
    });
  }

  /**
   * Whether the caller has `evidence:update`, mirroring PermissionGuard's
   * precedence (platform admin → API key scopes → service token → roles). Used
   * to keep ensure-setup's list path read-only while still letting writers
   * provision missing documents.
   */
  private async resolveCanWrite(ctx: AuthContextType): Promise<boolean> {
    const RESOURCE = 'evidence';
    const ACTION = 'update';
    if (ctx.isPlatformAdmin) return true;

    if (ctx.isApiKey) {
      const scopes = ctx.apiKeyScopes;
      // Legacy keys (empty scopes) keep full access until the guard's cutoff;
      // the guard already blocks them past the deprecation date.
      if (!scopes || scopes.length === 0) return true;
      return scopes.includes(`${RESOURCE}:${ACTION}`);
    }

    if (ctx.isServiceToken) {
      const service = resolveServiceByName(ctx.serviceName);
      return service?.permissions.includes(`${RESOURCE}:${ACTION}`) ?? false;
    }

    const perms = await resolveRolePermissions(
      ctx.organizationId,
      ctx.userRoles ?? [],
    );
    return permissionsGrant(perms, RESOURCE, ACTION);
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
    @UserId() userId: string,
  ) {
    return this.ismsService.decline({ documentId: id, organizationId, userId });
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
